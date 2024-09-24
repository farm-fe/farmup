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

- [ ] support more entry file (without execute)
- [ ] define multiple configurations within a single configuration file.
- [ ] provide more convenient configuration for package library.
- [ ] Integration of some built-in plugins (e.g: `dts`)
- [ ] more cli options
  - [ ] sourcemap
  - [ ] ignore some watch file
- [ ] support monorepo?
- [x] execute without output file
  - [x] cjs
  - [x] esm

## option

see [here](./docs/flags.md)
