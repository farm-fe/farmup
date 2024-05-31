# Contributing

## Local Development

```shell
# 1. install dependents
pnpm install

# 2. build source
pnpm run build

# 3. local development
# start watch mode for build source
pnpm run farmup

# 4. link to global, use in other somewhere
pnpm link --global

# 5. test your change
farmup file.ts
```

## Ready PR

<!-- TODO: add lint in CI -->

1. lint or other check

```shell
pnpm run ready
```

2. run changeset
3. select changed package e.g farmup
4. select an appropriate version number, e.g `patch`

```shell
npx changeset
```

## Create PR

create PR in github and add reviewer for your PR
