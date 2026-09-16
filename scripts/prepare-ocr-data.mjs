import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicRoot = join(root, 'public', 'tesseract')
const coreRoot = join(publicRoot, 'core')
const workerRoot = join(publicRoot, 'worker')
const langRoot = join(publicRoot, 'lang')

await rm(publicRoot, { recursive: true, force: true })
await mkdir(coreRoot, { recursive: true })
await mkdir(workerRoot, { recursive: true })
await mkdir(langRoot, { recursive: true })

const corePackage = join(root, 'node_modules', 'tesseract.js-core')
const tesseractPackage = join(root, 'node_modules', 'tesseract.js')
const languages = ['eng', 'tur']

for (const file of ['tesseract-core.wasm.js', 'tesseract-core-simd.wasm.js', 'tesseract-core-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js']) {
  await cp(join(corePackage, file), join(coreRoot, file))
}
await cp(join(tesseractPackage, 'dist', 'worker.min.js'), join(workerRoot, 'worker.min.js'))

for (const language of languages) {
  await cp(join(root, 'node_modules', `@tesseract.js-data/${language}`, '4.0.0_best_int', `${language}.traineddata.gz`), join(langRoot, `${language}.traineddata.gz`))
}

console.log('Local Tesseract OCR runtime prepared.')
