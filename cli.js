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
const hasYarn = require('has-yarn');

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
    --watch, -w          Watch for changes.
    --connect, -c        Can be used with link command to also connect.
    --manager            Package manager to use npm or yarn. Defaults: 'yarn'

Examples
    $ connect-deps link ../dep-folder1 ../dep-folder2
    $ connect-deps link ../dep-folder1 ../dep-folder2 -c -w
    $ connect-deps connect -w
`, {
    flags: {
        watch: {
            type: 'boolean',
            alias: 'w'
        },
        connect: {
            type: 'boolean',
            alias: 'c'
        },
        manager: {
            type: 'string',
            alias: 'm',
            default: hasYarn() ? 'yarn' : 'npm'
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

let packageManager;

if (cli.flags.manager === 'yarn') {
    packageManager = {
        add: modules => execa('yarn', ['add', ...modules]),
        rm: modules => execa('yarn', ['remove', ...modules]),
        addDev: modules => execa('yarn', ['add', '--dev', ...modules]),
        pack: (packFile, depPath) =>
            execa('yarn', ['pack', '--filename', packFile], { cwd: depPath })
    };
}

if (cli.flags.manager === 'npm') {
    packageManager = {
        add: modules => execa('npm', ['install', ...modules]),
        rm: modules => execa('npm', ['rm', ...modules]),
        addDev: modules => execa('npm', ['install', '--save-dev', ...modules]),
        pack: async (packFile, depPath) => {
            const cacheDir = path.parse(packFile).dir;
            const out = await execa('npm', ['pack', '-s', depPath], { cwd: cacheDir });

            fs.renameSync(
                path.join(cacheDir, out.stdout),
                packFile);
        }
    };
}

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
    const inputs = cli.input.slice(1);

    if (inputs.length === 0) {
        cli.showHelp();
    }

    for (const input of inputs) {
        const spinner = ora(`Linking ${input}`).start();
        const connectedPath = path.resolve(cwd, input);

        try {
            const connectedPkg = readPkg.sync({ cwd: connectedPath });

            if (connectedPkg) {
                let version;

                // search deps for package
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

                // search dev deps for package
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

                // if still not found probably the package is not published
                // so we add a placeholder thats deleted on reset
                if (!version) {
                    conf.set(connectedPkg.name, {
                        name: connectedPkg.name,
                        path: connectedPath,
                        version: connectedPkg.version,
                        watch: '**/*',
                        snapshot: {
                            version: 'DELETE',
                            type: 'normal'
                        }
                    });
                }
                fs.mkdirSync(path.join(cwd, '.connect-deps-cache'), { recursive: true });
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

    if (cli.flags.connect) {
        connect();
    }
}

async function connect() {
    const deps = conf.store;

    await packInstall(Object.values(deps));

    if (cli.flags.watch) {
        const queue = new PQueue({ concurrency: 1 });
        const queuePackInstall = async (deps) => {
            queue.add(async () => packInstall(deps));
        };

        for (const key in deps) {
            const debounced = pDebounce(queuePackInstall, 1000);
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
    }
}

async function reset() {
    const deps = conf.store;
    const normal = [];
    const dev = [];
    const remove = [];
    const spinner = ora('Resetting dependencies');

    for (const key in deps) {
        const dep = deps[key];

        if (dep.snapshot.version === 'DELETE') {
            remove.push(dep.name);
        } else if (dep.snapshot.type === 'dev') {
            dev.push(`${dep.name}@${dep.snapshot.version}`);
        } else {
            normal.push(`${dep.name}@${dep.snapshot.version}`);
        }
    }

    if (normal.length > 0) {
        spinner.start(`Resetting normal dependencies:  ${normal.join(' ')}`);
        try {
            await packageManager.add(normal);
            spinner.succeed();
        } catch (err) {
            console.error(err);
            spinner.fail(err.message);
        }
    }

    if (dev.length > 0) {
        spinner.start(`Resetting dev dependencies: ${dev.join(' ')}`);
        try {
            await packageManager.addDev(dev);
            spinner.succeed();
        } catch (err) {
            console.error(err);
            spinner.fail();
        }
    }

    if (remove.length > 0) {
        spinner.start(`Resetting unpublished dependencies: ${dev.join(' ')}`);
        try {
            await packageManager.rm(remove);
            spinner.succeed();
        } catch (err) {
            console.error(err);
            spinner.fail();
        }
    }
    spinner.start('Cleaning up');
    try {
        await del(path.join(cwd, '.connect-deps.json'));
        await del(path.join(cwd, '.connect-deps-cache'), { force: true });
        spinner.succeed();
    } catch (err) {
        console.error(err);
        spinner.fail();
    }
}

async function packInstall(configs = []) {
    const spinner = ora('Connecting dependencies');
    const normal = [];
    const dev = [];

    for (const config of configs) {
        spinner.start(`Packing ${config.name}`);
        try {
            const name = `./.connect-deps-cache/${config.name.replace('/', '--').replace('@', '--')}-${config.version}-${Date.now()}.tgz`;
            const packFile = path.join(cwd, name);

            await packageManager.pack(packFile, config.path);
            if (config.snapshot.type === 'dev') {
                dev.push(`file:${packFile}`);
            } else {
                normal.push(`file:${packFile}`);
            }
            spinner.succeed();
        } catch (err) {
            spinner.fail();
            throw err;
        }
    }

    if (normal.length > 0) {
        spinner.start(`Installing dependencies: ${normal.join(' ')}`);
        try {
            await packageManager.add(normal);
            spinner.succeed();
        } catch (err) {
            spinner.fail();
            throw err;
        }
    }
    if (dev.length > 0) {
        spinner.start(`Installing dev dependencies: ${dev.join(' ')}`);
        try {
            await packageManager.addDev(dev);
            spinner.succeed();
        } catch (err) {
            spinner.fail();
            throw err;
        }
    }
}

