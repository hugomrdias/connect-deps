# connect-deps [![NPM Version](https://img.shields.io/npm/v/connect-deps.svg)](https://www.npmjs.com/package/connect-deps) [![NPM Downloads](https://img.shields.io/npm/dt/connect-deps.svg)](https://www.npmjs.com/package/connect-deps) [![NPM License](https://img.shields.io/npm/l/connect-deps.svg)](https://www.npmjs.com/package/connect-deps) [![Build Status](https://travis-ci.org/hugomrdias/connect-deps.svg?branch=master)](https://travis-ci.org/hugomrdias/connect-deps) [![codecov](https://codecov.io/gh/hugomrdias/connect-deps/badge.svg?branch=master)](https://codecov.io/gh/hugomrdias/connect-deps?branch=master)

> This is a CLI tool that intends to be a better yarn link

When you do a yarn/npm link in the current repo, it creates a symlink to the dependency in your machine and this gives you the wrong dependency tree, because node_modules inside the linked dependency will be the one already in the there not the one that you would get from a clean yarn install in the current repo.   

This can became problematic in some cases, to solve this problem this package "links" (we call it connect) a dependency by running `yarn pack` in the connected dependency and `yarn add file:/path/to/pack.tgz` in the current repo.


## Usage

```bash
# first link the dependency from your current repo
connect-deps link ../package-linkded
# after you can `connect` to stay linked
connect-deps connect
# or use watch mode to listen to changes and update the current repo
connect-deps connect -w
# after you done with coding run `reset` to cleanup and go back to previous versions
connect-deps reset

```


## CLI

```
$ npm install --global connect-deps
```

```
$ connect-deps --help

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
```


## License

MIT © [Hugo Dias](http://hugodias.me)
