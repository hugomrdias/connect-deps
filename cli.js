#!/usr/bin/env node
/* eslint-disable guard-for-in */
/* eslint-disable no-await-in-loop */
'use strict';

const fs = require('fs');
const path = require('path');
const meow = require('meow');
const ora = require('ora');
const execa = require('execa');
const del = require('del');
const chokidar = require('chokidar');
const pDebounce = require('p-debounce');
const readPkg = require('read-pkg');
const Conf = require('conf');
const { default: PQueue } = require('p-queue');
const updateNotifier = require('update-notifier');

const cli = meow(`
Usage
    $ connect-deps [cmd]

Commands
    link /relative/path  Relative paths from cwd to dependency to connect.
    connect              Connect a linked dependency.
    reset                Reset everything and clean up.

Options
    --help               Show help.
    --version            Show version.
    --watch, -w          Watch for changes, works with the 'connect' command only.

Examples
    $ connect-deps link ../dep-folder1 ../dep-folder2
    $ connect-deps connect -w
`, {
    flags: {
        watch: {
            type: 'boolean',
            alias: 'w'
        }
    }
});

const cmd = cli.input[0];

updateNotifier({ pkg: cli.pkg }).notify();

let cwd;
let pkg;
let conf;

if (['link', 'connect', 'reset'].includes(cmd)) {
    try {
        cwd = fs.realpathSync(process.cwd());
        pkg = readPkg.sync({ cwd });
        conf = new Conf({
            cwd,
            configName: '.connect-deps'
        });
    } catch (err) {
        if (err.code && err.code === 'ENOENT') {
            console.error('Error: can\'t find package.json');
        } else {
            console.error(err);
        }
    }
}

const packageManager = {
    add: modules => execa('yarn', ['add', ...modules]),
    addDev: modules => execa('yarn', ['add', '--dev', ...modules]),
    pack: (packFile, depPath) => execa('yarn', ['pack', '--filename', packFile], { cwd: depPath })
};

switch (cmd) {
    case 'link':
        link();
        break;
    case 'connect':
        connect();
        break;
    case 'reset':
        reset();
        break;
    default:
        cli.showHelp();
        break;
}

function link() {
    // create the folder to store the pack files
    fs.mkdirSync(path.join(cwd, '.connect-deps-cache'), { recursive: true });
    const inputs = cli.input.slice(1);

    for (const input of inputs) {
        const spinner = ora(`Linking ${input}`).start();
        const connectedPath = path.resolve(cwd, input);

        try {
            const connectedPkg = readPkg.sync({ cwd: connectedPath });

            if (connectedPkg) {
                let version;

                for (const prop in pkg.dependencies) {
                    if (prop === connectedPkg.name) {
                        version = pkg.dependencies[prop];
                        conf.set(connectedPkg.name, {
                            name: connectedPkg.name,
                            path: connectedPath,
                            version: connectedPkg.version,
                            watch: '**/*',
                            snapshot: {
                                version,
                                type: 'normal'
                            }
                        });
                    }
                }

                if (!version) {
                    for (const prop in pkg.devDependencies) {
                        if (prop === connectedPkg.name) {
                            version = pkg.devDependencies[prop];
                            conf.set(connectedPkg.name, {
                                name: connectedPkg.name,
                                path: connectedPath,
                                version: connectedPkg.version,
                                watch: '**/*',
                                snapshot: {
                                    version,
                                    type: 'dev'
                                }
                            });
                        }
                    }
                }
                spinner.succeed();
            }
        } catch (err) {
            if (err.code && err.code === 'ENOENT') {
                spinner.fail(`Error: can't find ${connectedPath}`);
            } else {
                spinner.fail();
                console.error(err);
            }
        }
    }
}

async function connect() {
    const deps = conf.store;

    if (cli.flags.watch) {
        const queue = new PQueue({ concurrency: 1 });
        const queuePackInstall = async (deps) => {
            queue.add(async () => packInstall(deps));
        };
        const debounced = pDebounce(queuePackInstall, 1000, { leading: true });

        for (const key in deps) {
            const dep = deps[key];

            chokidar
                .watch(dep.watch, {
                    ignored: /node_modules|\.git/,
                    cwd: dep.path,
                    awaitWriteFinish: {
                        stabilityThreshold: 1000,
                        pollInterval: 100
                    },
                    ignoreInitial: true
                })
                .on('ready', () => {
                    console.log(`Watching in ${dep.path} for ${dep.watch}`);
                })
                .on('all', async () => {
                    await debounced([dep]);
                })
                .on('error', err => console.error('error watching: ', err));
        }
    } else {
        try {
            await packInstall(Object.values(deps));
        } catch (err) {
            console.error(err);
        }
    }
}

async function reset() {
    const deps = conf.store;
    const normal = [];
    const dev = [];
    const spinner = ora('Resetting dependencies');

    for (const key in deps) {
        const dep = deps[key];

        if (dep.snapshot.type === 'dev') {
            dev.push(`${dep.name}@${dep.snapshot.version}`);
        } else {
            normal.push(`${dep.name}@${dep.snapshot.version}`);
        }
    }

    if (normal.length > 0) {
        spinner.start(`Resetting normal dependencies:  ${normal.join(' ')}`);
        await packageManager.add(normal);
        spinner.succeed();
    }

    if (dev.length > 0) {
        spinner.start(`Resetting dev dependencies: ${dev.join(' ')}`);
        await packageManager.addDev(dev);
        spinner.succeed();
    }
    spinner.start('Cleaning up');
    await del(path.join(cwd, '.connect-deps.json'));
    await del(path.join(cwd, '.connect-deps-cache'), { force: true });
    spinner.succeed();
}

async function packInstall(configs = []) {
    const spinner = ora('Connecting dependencies');
    const normal = [];
    const dev = [];

    for (const config of configs) {
        spinner.start(`Packing ${config.name}`);
        const name = `./.connect-deps-cache/${config.name}-${config.version}-${Date.now()}.tgz`;
        const packFile = path.join(cwd, name);

        await packageManager.pack(packFile, config.path);
        if (config.snapshot.type === 'dev') {
            dev.push(`file:${packFile}`);
        } else {
            normal.push(`file:${packFile}`);
        }
        spinner.succeed();
    }

    if (normal.length > 0) {
        spinner.start(`Installing dependencies: ${normal.join(' ')}`);
        await packageManager.add(normal);
        spinner.succeed();
    }
    if (dev.length > 0) {
        spinner.start(`Installing dev dependencies: ${dev.join(' ')}`);
        await packageManager.addDev(dev);
        spinner.succeed();
    }
}

