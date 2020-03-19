# connect-deps [![NPM Version](https://img.shields.io/npm/v/connect-deps.svg)](https://www.npmjs.com/package/connect-deps) [![NPM Downloads](https://img.shields.io/npm/dt/connect-deps.svg)](https://www.npmjs.com/package/connect-deps) [![NPM License](https://img.shields.io/npm/l/connect-deps.svg)](https://www.npmjs.com/package/connect-deps) [![Build Status](https://travis-ci.org/hugomrdias/connect-deps.svg?branch=master)](https://travis-ci.org/hugomrdias/connect-deps) [![codecov](https://codecov.io/gh/hugomrdias/connect-deps/badge.svg?branch=master)](https://codecov.io/gh/hugomrdias/connect-deps?branch=master)

> This is a CLI tool that intends to be a better yarn/npm link

When you do a yarn/npm link in the current repo, it creates a symlink to the dependency in your machine and this gives you the wrong dependency tree, because node_modules inside the linked dependency will be the one already in the there not the one that you would get from a clean yarn/npm install in the current repo.   

This can became problematic in some cases, to solve this problem this package "links" (we call it connect) a dependency by running `yarn pack` in the connected dependency and `yarn add file:/path/to/pack.tgz` in the current repo.

For a real world example where `npm link` failed, see the blog post [When npm link fails](https://vmx.cx/cgi-bin/blog/index.cgi/when-npm-link-fails%3A2019-08-01%3Aen%2CJavaScript%2Cnpm).

Support for unpublished packages or packages not listed in package.json is also included.



## Usage

```bash
# first link the dependency from your current repo
connect-deps link ../package-linked
# after, you can `connect` to stay in sync
connect-deps connect
# or use watch mode to listen to changes and update the current repo
connect-deps connect -w
# after you done with coding run `reset` to cleanup and go back to previous versions
connect-deps reset
# Reset may not leave your package.json exactly like before `connect` (https://github.com/hugomrdias/connect-deps/issues/3#issuecomment-517668975) but the change should not be harmful and you can always ignore the change before commiting.

# tips
# link multiple, connect and watch in one command
connect-deps link ../package-linked ../package-linked2 --connect --watch

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
    --watch, -w          Watch for changes.
    --connect, -c        Can be used with link command to also connect.

Examples
    $ connect-deps link ../dep-folder
    $ connect-deps link ../dep-folder1 ../dep-folder2 -c -w
    $ connect-deps connect -w
```


## License

MIT © [Hugo Dias](http://hugodias.me)
