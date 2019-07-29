#!/usr/bin/env node
/* eslint-disable guard-for-in */
/* eslint-disable no-await-in-loop */
'use strict';

const fs = require('fs');
const path = require('path');
const meow = require('meow');
const execa = require('execa');
const del = require('del');
const chokidar = require('chokidar');
const readPkgUp = require('read-pkg-up');
const Conf = require('conf');

const cwd = fs.realpathSync(process.cwd());
const { package: pkg } = readPkgUp.sync({ cwd });
const conf = new Conf({
    cwd,
    configName: '.connect-deps'
});
let isRunning = false;

const cli = meow(`
Usage
    $ connect-deps [cmd]

Commands
    link /relative/path  Relative path from cwd to dependency to connect.
    connect              Connect a linked dependency.
    reset                Reset everything and clean up.

Options
    --help               Show help.
    --watch, -w          Watch for changes, works with the 'connect' command only.

Examples
    $ connect-deps link ../dep-folder
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

if (cmd === 'link') {
    link();
}

if (cmd === 'connect') {
    connect();
}

if (cmd === 'reset') {
    reset();
}

function link() {
    const connectedPath = path.resolve(cwd, cli.input[1]);
    const connectedPkg = readPkgUp.sync({ cwd: path.resolve(cwd, cli.input[1]) });

    if (connectedPkg) {
        let version;

        // create the folder to store the pack files
        fs.mkdirSync(path.join(cwd, '.connect-deps-cache'), { recursive: true });

        for (const prop in pkg.dependencies) {
            if (prop === connectedPkg.package.name) {
                version = pkg.dependencies[prop];
                conf.set(connectedPkg.package.name, {
                    name: connectedPkg.package.name,
                    path: connectedPath,
                    version: connectedPkg.package.version,
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
                if (prop === connectedPkg.package.name) {
                    version = pkg.devDependencies[prop];
                    conf.set(connectedPkg.package.name, {
                        name: connectedPkg.package.name,
                        path: connectedPath,
                        version: connectedPkg.package.version,
                        watch: '**/*',
                        snapshot: {
                            version,
                            type: 'dev'
                        }
                    });
                }
            }
        }
    } else {
        console.error(`Error: can't find ${connectedPath}`);
    }
}

async function connect() {
    const deps = conf.store;

    if (cli.flags.watch) {
        for (const key in deps) {
            const dep = deps[key];

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
                    await packInstall([dep]);
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

    for (const key in deps) {
        const dep = deps[key];

        if (dep.snapshot.type === 'dev') {
            dev.push(`${dep.name}@${dep.snapshot.version}`);
        } else {
            normal.push(`${dep.name}@${dep.snapshot.version}`);
        }
    }

    if (normal.length > 0) {
        console.log(`Resetting normal dependencies:  ${normal.join(' ')}`);
        await execa('yarn', [
            'add',
            ...normal
        ]);
        console.log('Resetting normal dependencies done.');
    }

    if (dev.length > 0) {
        console.log(`Resetting dev dependencies: ${dev.join(' ')}`);
        await execa('yarn', [
            'add',
            ...dev,
            '--dev'
        ]);
        console.log('Resetting dev dependencies done.');
    }

    await del(path.join(cwd, '.connect-deps.json'));
    await del(path.join(cwd, '.connect-deps-cache'), { force: true });
}

async function packInstall(configs = []) {
    if (isRunning) {
        console.log('Connect is already running, skipped.');

        return;
    }

    isRunning = true;
    const normal = [];
    const dev = [];

    for (const config of configs) {
        console.log(`Packing ${config.name}...`);
        const name = `./.connect-deps-cache/${config.name}-${config.version}-${Date.now()}.tgz`;
        const packFile = path.join(cwd, name);

        await execa('yarn', ['pack', '--filename', packFile], { cwd: config.path });
        if (config.snapshot.type === 'dev') {
            dev.push(`file:${packFile}`);
        } else {
            normal.push(`file:${packFile}`);
        }
        console.log(`Packing ${config.name} done.`);
    }

    if (normal.length > 0) {
        console.log('Installing deps.');
        await execa('yarn', [
            'add',
            ...normal
        ]);
        console.log('Installing deps done.');
    }
    if (dev.length > 0) {
        console.log('Installing dev deps.');
        await execa('yarn', [
            'add',
            '--dev',
            ...dev
        ]);
        console.log('Installing dev deps done.');
    }

    isRunning = false;
}

