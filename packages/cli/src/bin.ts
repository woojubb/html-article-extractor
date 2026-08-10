#!/usr/bin/env node

import { run } from './cli'

run(process.argv.slice(2)).catch(function (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`html-article-extractor: ${message}\n`)
    process.exitCode = 1
})
