#!/usr/bin/env node
/* eslint-disable guard-for-in */

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
    run();
}

if (cmd === 'reset') {
    reset();
}

function link() {
    const connectedPath = path.resolve(cwd, cli.input[1]);
    const connectedPkg = readPkgUp.sync({ cwd: connectedPath });

    if (connectedPkg) {
        let version;

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

        if (version) {
            packInstall(conf.get(connectedPkg.package.name));
        }
    } else {
        console.error(`Error: can't find ${connectedPath}`);
    }
}

async function run() {
    const deps = conf.store;
    const all = [];

    for (const key in deps) {
        const value = deps[key];

        if (cli.flags.watch && value.watch) {
            chokidar
                .watch(value.watch, {
                    ignored: /node_modules|\.git/,
                    cwd: value.path,
                    // awaitWriteFinish: true,
                    ignoreInitial: true
                })
                .on('ready', () => {
                    console.log(`Watching in ${value.path} for ${value.watch}`);
                })
                .on('all', async () => {
                    await packInstall(deps[key]);
                })
                .on('error', err => console.error('error watching: ', err));
        } else {
            all.push(packInstall(deps[key]));
        }
    }

    try {
        await Promise.all(all);
    } catch (err) {
        console.log(err);
    }
}

async function reset() {
    const deps = conf.store;
    const all = [];

    for (const key in deps) {
        const value = deps[key];

        console.log(`Resetting ${key}...`);
        all.push(execa('npm', [
            'install',
            `${value.name}@${value.snapshot.version}`,
            value.snapshot.type === 'dev' ? '--save-dev' : ''
        ], { cwd }));
        all.push(del(path.join(cwd, '.connect-deps.json')));
        all.push(del(path.join(cwd, '.connect-deps-cache'), { force: true }));
    }

    try {
        await Promise.all(all);
        console.log('Resetting done.');
    } catch (err) {
        console.log(err);
    }
}

async function packInstall(config) {
    if (config.running) {
        console.log('Connect is already running, skipped.');

        return;
    }

    conf.set(config.name, Object.assign(config, { running: true }));
    console.log(`Connecting ${config.name}...`);
    const name = `${config.name}-${config.version}.tgz`;
    const uniqueName = `${config.name}-${config.version}-${Date.now()}.tgz`;

    // Create a cache directory in the project directory we call `link` from
    const depsCache = path.join(cwd, '.connect-deps-cache');

    fs.mkdirSync(depsCache, { recursive: true });

    try {
        await execa('npm', ['pack', config.path], { cwd: depsCache });
        // Rename the packed file into something unique to make sure that the
        // newly created one gets installed and not some older version of it
        fs.renameSync(
            path.join(depsCache, name),
            path.join(depsCache, uniqueName)
        );

        await execa('npm', [
            'install',
            'file:' + path.join(depsCache, uniqueName),
            config.snapshot.type === 'dev' ? '--save-dev' : ''
        ], { cwd });
        console.log(`Connecting ${config.name} done.`);
    } catch (err) {
        console.log(err);
    } finally {
        conf.set(config.name, Object.assign(config, { running: false }));
    }
}
