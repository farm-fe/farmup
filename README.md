<h1 align="center">
Farm
</h1>

<p align="center">easy run your TypeScript、JavaScript or html</p>

<p align="center">powered by <a href="https://github.com/farm-fe/farm">Farm</a></p>

<hr />

feature

- cross import CommonJs and EsModule
- watch mode

## Setup

```shell
pnpm i farmup
```

or install global

```shell
pnpm i -g farmup
```

## Get Started

watch mode, it's for command

```shell
farmup index.ts
```

start an server, can build and start html entry

```shell
farmup start index.html
```

build and execute, like `farmup`, but it can only-build

```shell
farmup build index.ts
```

## roadmap

- support more file
- more cli options

## options

### exec

- `alias`: e

can custom exec, default node

```shell
farmup index.ts -e node

farmup index.ts -e cat
```

### format

- option: `cjs` | `esm`

```shell
farmup --format cjs index.ts
```

### minify

```shell
farmup --minify index.ts
```

### config

custom specify farm config, for more, see [farm config](https://www.farmfe.org/docs/config/configuring-farm)

by default, it automatically finds the configuration

if you not use local config, use `--no-config` option

### target

- `option`: `node`、`browser`, more see [targetEnv](https://www.farmfe.org/docs/config/compilation-options#outputtargetenv)

define your production environment

### watch

- `alias`: `w`

add extra watch files, support [glob](https://www.npmjs.com/package/glob) pattern

### external

set external package or path

### autoExternal

- `default`: `true`

in your code, if not find `package` or `source`, set external
