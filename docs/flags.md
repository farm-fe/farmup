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
- option: `boolean` | `'inline'` | `'all'` | `'all-inline'`

generate sourcemap

### no-experience-script

- option: `boolean`

disable exec esm without output to filesystem
