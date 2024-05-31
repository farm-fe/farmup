<h1 align="center">
Farmup
</h1>

<p align="center">easy run your TypeScript、JavaScript or html</p>

<p align="center">powered by <a href="https://github.com/farm-fe/farm">Farm</a></p>

<hr />

feature

- cross import CommonJs and EsModule
- watch mode
- support html

## Setup

```shell
pnpm i farmup
```

or install global

```shell
pnpm i -g farmup
```

## Get Started

run js/ts file

```shell
farmup index.ts
```

run html file, because `farm` is used, even if it is html, it will automatically compile the referenced js and ts files.

```shell
farmup index.html
```

build and exec, but it can only-build

```shell
farmup build index.ts

# only-build
farmup build index.ts --no-exec
```

## roadmap

- support more entry file
- more cli options
  - sourcemap
  - ignore some watch file
- execute without output file

## options

### exec

- `alias`: e

can custom exec, select the exec method by default through the suffix of the file

- html use server star
- ts\js use node

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

### sourcemap

- `default`: `undefined`
- option:  `boolean`|`'true'`|`'false'` | `'inline'` | `'all'` | `'all-inline'`

generate sourcemap
