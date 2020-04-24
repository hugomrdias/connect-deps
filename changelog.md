# [0.3.0](https://github.com/hugomrdias/connect-deps/compare/v0.2.2...v0.3.0) (2020-04-24)


### Bug Fixes

* show help on how to recover a failed commit message ([#21](https://github.com/hugomrdias/connect-deps/issues/21)) ([5dfe5fd](https://github.com/hugomrdias/connect-deps/commit/5dfe5fd61161a876b01de6a9f1a1fe1f65592651)), closes [#4](https://github.com/hugomrdias/connect-deps/issues/4)


### Features

* add manager option ([eee5168](https://github.com/hugomrdias/connect-deps/commit/eee5168c2426974b1985a039386cd7982bf1638f))



## [0.2.2](https://github.com/hugomrdias/connect-deps/compare/v0.2.1...v0.2.2) (2020-01-30)


### Bug Fixes

* a few tweaks and updated deps ([5e96a63](https://github.com/hugomrdias/connect-deps/commit/5e96a63a248e8f64db27083330a6cbecc0444034))
* fix tests ([0fe86c2](https://github.com/hugomrdias/connect-deps/commit/0fe86c2997fb37abbdb7c137101799c252f4cdca))



## [0.2.1](https://github.com/hugomrdias/connect-deps/compare/v0.2.0...v0.2.1) (2020-01-30)


### Bug Fixes

* fix connect for package with prepare scripts ([8ea4833](https://github.com/hugomrdias/connect-deps/commit/8ea48335b8ea10a3ab27375c4a711a99534248cf)), closes [#20](https://github.com/hugomrdias/connect-deps/issues/20)



# [0.2.0](https://github.com/hugomrdias/connect-deps/compare/v0.1.1...v0.2.0) (2020-01-20)


### Bug Fixes

* fix path handling for non published packages with npm ([bcac118](https://github.com/hugomrdias/connect-deps/commit/bcac118bd2aa1ff71d1e49586e5d89999850f4ef))


### Features

* support unpublished package ([405b813](https://github.com/hugomrdias/connect-deps/commit/405b8132d5104ba44071bbf8628622d870291b40))



## [0.1.1](https://github.com/hugomrdias/connect-deps/compare/v0.1.0...v0.1.1) (2019-12-13)


### Bug Fixes

* add try/catch to stop spinner on error ([53979da](https://github.com/hugomrdias/connect-deps/commit/53979da5a253274bd40a52caad4a7ab48d95172b))



# [0.1.0](https://github.com/hugomrdias/connect-deps/compare/v0.0.7...v0.1.0) (2019-12-13)


### Features

* support scoped package, link --connect and connect when --watch ([6b74b5f](https://github.com/hugomrdias/connect-deps/commit/6b74b5fc5793063d554610caa800ec43401428bd))



## [0.0.7](https://github.com/hugomrdias/connect-deps/compare/v0.0.6...v0.0.7) (2019-07-31)


### Features

* add support for npm ([#10](https://github.com/hugomrdias/connect-deps/issues/10)) ([f34f336](https://github.com/hugomrdias/connect-deps/commit/f34f3369fde08dedadfaf423c1a56e2a5e0c8361))
* make it queue from multiple repos within the debounce ([1bdd9d3](https://github.com/hugomrdias/connect-deps/commit/1bdd9d326230e3ec8ba468781983f08e6cf2dd22))



## [0.0.6](https://github.com/hugomrdias/connect-deps/compare/v0.0.5...v0.0.6) (2019-07-31)


### Bug Fixes

* remove debugging leftover ([5cad511](https://github.com/hugomrdias/connect-deps/commit/5cad511784503634d793c52ef9b335f4c1fe2094))



## [0.0.5](https://github.com/hugomrdias/connect-deps/compare/v0.0.4...v0.0.5) (2019-07-31)


### Features

* empty link help, run trailing call ([3ee0c1b](https://github.com/hugomrdias/connect-deps/commit/3ee0c1b5b6e34b13f7c62c8f75f18c5fab872979)), closes [#9](https://github.com/hugomrdias/connect-deps/issues/9) [#8](https://github.com/hugomrdias/connect-deps/issues/8)



## [0.0.4](https://github.com/hugomrdias/connect-deps/compare/v0.0.3...v0.0.4) (2019-07-30)


### Bug Fixes

* protect running cli outside a git repo ([235b9ee](https://github.com/hugomrdias/connect-deps/commit/235b9ee287b87b372044977f93ab860993868e7d))



## [0.0.3](https://github.com/hugomrdias/connect-deps/compare/v0.0.2...v0.0.3) (2019-07-30)


### Bug Fixes

* fix link not found error ([9edadf4](https://github.com/hugomrdias/connect-deps/commit/9edadf404b7a5d7d715421eb167800a8e18fab16))
* use only one queue for multiple watches and improve link errors ([36ad864](https://github.com/hugomrdias/connect-deps/commit/36ad8640b323669e6df9d2ecdc698207255a710f))


### Features

* debounce 1s and watch with awaitWriteFinish ([374c94e](https://github.com/hugomrdias/connect-deps/commit/374c94eaaceef62a0e7dfc8ddfb0aec710e5ba93))
* improve cli ui, link cmd supports multiples paths ([2df1d29](https://github.com/hugomrdias/connect-deps/commit/2df1d299ec42c9998d7545b7fe17a71dbc5c3349))
* reword promises handling, support multiple deps ([99dfbce](https://github.com/hugomrdias/connect-deps/commit/99dfbced1766f3c4b0ce8352b1b3b6659a32fdd1)), closes [#1](https://github.com/hugomrdias/connect-deps/issues/1) [#2](https://github.com/hugomrdias/connect-deps/issues/2) [#3](https://github.com/hugomrdias/connect-deps/issues/3)
* updateNotifier, watch queue, print help by default ([220b6cf](https://github.com/hugomrdias/connect-deps/commit/220b6cf043733fd94e5b6dfabece2ef070942541)), closes [#8](https://github.com/hugomrdias/connect-deps/issues/8) [#6](https://github.com/hugomrdias/connect-deps/issues/6)



## [0.0.2](https://github.com/hugomrdias/connect-deps/compare/v0.0.1...v0.0.2) (2019-07-11)


### Bug Fixes

* move cache folder outside node_modules ([0a52bff](https://github.com/hugomrdias/connect-deps/commit/0a52bff67d88f8092696f2515023580672c21f87))



## [0.0.1](https://github.com/hugomrdias/connect-deps/compare/2a809c5d0ffb20cb6b8899097a3e9ae3c216c703...v0.0.1) (2019-07-11)


### Features

* initial commit ([2a809c5](https://github.com/hugomrdias/connect-deps/commit/2a809c5d0ffb20cb6b8899097a3e9ae3c216c703))



