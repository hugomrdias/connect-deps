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

const cwd = fs.realpathSync(process.cwd());
const pkg = readPkg.sync({ cwd });
const conf = new Conf({
    cwd,
    configName: '.connect-deps'
});

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
        } else {
            spinner.fail(`Error: can't find ${connectedPath}`);
        }
    }
}

async function connect() {
    const deps = conf.store;

    if (cli.flags.watch) {
        for (const key in deps) {
            const dep = deps[key];
            const queue = new PQueue({ concurrency: 1 });
            const queuePackInstall = async (deps) => {
                queue.add(async () => packInstall(deps));
            };
            const debounced = pDebounce(queuePackInstall, 2000, { leading: true });

            chokidar
                .watch(dep.watch, {
                    ignored: /node_modules|\.git/,
                    cwd: dep.path,
                    // awaitWriteFinish: true,
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
        await execa('yarn', [
            'add',
            ...normal
        ]);
        spinner.succeed();
    }

    if (dev.length > 0) {
        spinner.start(`Resetting dev dependencies: ${dev.join(' ')}`);
        await execa('yarn', [
            'add',
            ...dev,
            '--dev'
        ]);
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

        await execa('yarn', ['pack', '--filename', packFile], { cwd: config.path });
        if (config.snapshot.type === 'dev') {
            dev.push(`file:${packFile}`);
        } else {
            normal.push(`file:${packFile}`);
        }
        spinner.succeed();
    }

    if (normal.length > 0) {
        spinner.start(`Installing dependencies: ${normal.join(' ')}`);
        await execa('yarn', ['add', ...normal]);
        spinner.succeed();
    }
    if (dev.length > 0) {
        spinner.start(`Installing dev dependencies: ${dev.join(' ')}`);
        await execa('yarn', ['add', '--dev', ...dev]);
        spinner.succeed();
    }
}

