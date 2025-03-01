#!/usr/bin/env ts-node
import { intro, outro, text, select, confirm, multiselect } from '@clack/prompts'
import chalk from 'chalk'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Orchestrates the interactive process for creating a Chrome extension.
 *
 * This asynchronous function prompts the user to provide essential extension details—including the extension name, description, manifest version, permissions, and optional features (background script, content script, popup page, options page, and DevTools page)—and then generates the required project files and directories accordingly. It configures the manifest file, creates relevant script and HTML files, optionally sets up a source folder and package.json for build options, and produces a TODO.md with next steps.
 *
 * The function terminates the process with an error if required inputs are missing or if the target extension directory already exists.
 */
async function main() {
  intro('Welcome to create-chrome-extension!')

  // Basic extension info
  const extNameRaw = await text({
    message: "What's the name of your extension?",
    placeholder: 'My Chrome Extension'
  })
  if (typeof extNameRaw !== 'string') {
    outro(chalk.red('No extension name provided.'))
    process.exit(1)
  }
  const extensionName = extNameRaw.trim()

  const extDescRaw = await text({
    message: 'Provide a short description for your extension:',
    placeholder: 'An awesome Chrome extension that does X, Y, and Z'
  })
  if (typeof extDescRaw !== 'string') {
    outro(chalk.red('No description provided.'))
    process.exit(1)
  }
  const extensionDescription = extDescRaw.trim()

  const versionRaw = await select({
    message: 'Select your manifest version:',
    options: [
      { value: 2, label: 'Manifest V2' },
      { value: 3, label: 'Manifest V3' }
    ]
  })
  if (typeof versionRaw !== 'number') {
    outro(chalk.red('No manifest version selected.'))
    process.exit(1)
  }
  const manifestVersion = versionRaw

  // Permissions
  const permissionsRaw = await multiselect({
    message: 'Select the permissions required for your extension:',
    options: [
      { value: 'activeTab', label: 'activeTab' },
      { value: 'tabs', label: 'tabs' },
      { value: 'storage', label: 'storage' },
      { value: 'cookies', label: 'cookies' },
      { value: 'webRequest', label: 'webRequest' },
      { value: 'webNavigation', label: 'webNavigation' },
      { value: 'bookmarks', label: 'bookmarks' },
      { value: 'history', label: 'history' },
      { value: 'notifications', label: 'notifications' },
      { value: 'contextMenus', label: 'contextMenus' },
      { value: 'alarms', label: 'alarms' },
      { value: 'management', label: 'management' },
      { value: 'identity', label: 'identity' },
      { value: 'declarativeContent', label: 'declarativeContent' },
      { value: 'geolocation', label: 'geolocation' },
      { value: 'clipboardRead', label: 'clipboardRead' },
      { value: 'clipboardWrite', label: 'clipboardWrite' }
    ]
  })
  const permissions: string[] = Array.isArray(permissionsRaw) ? permissionsRaw : []
  if (permissions.length === 0) {
    outro(chalk.red('At least one permission is required.'))
    process.exit(1)
  }

  // Icons (optional)
  const addIconsResp = await confirm({ message: 'Do you want to add icons to your extension?' })
  let icons: { [size: string]: string } = {}
  if (addIconsResp) {
    const icon16Raw = await text({ message: 'Enter path for 16x16 icon (leave blank to skip):' })
    const icon16 = typeof icon16Raw === 'string' ? icon16Raw.trim() : ''
    if (icon16) icons['16'] = icon16

    const icon48Raw = await text({ message: 'Enter path for 48x48 icon (leave blank to skip):' })
    const icon48 = typeof icon48Raw === 'string' ? icon48Raw.trim() : ''
    if (icon48) icons['48'] = icon48

    const icon128Raw = await text({ message: 'Enter path for 128x128 icon (leave blank to skip):' })
    const icon128 = typeof icon128Raw === 'string' ? icon128Raw.trim() : ''
    if (icon128) icons['128'] = icon128
  }

  // Additional extension features
  const additionalFeaturesRaw = await multiselect({
    message: 'Select additional features to include in your extension:',
    options: [
      { value: 'background', label: 'Background Script' },
      { value: 'content', label: 'Content Script' },
      { value: 'popup', label: 'Popup Page' },
      { value: 'options', label: 'Options Page' },
      { value: 'devtools', label: 'Devtools Page (Manifest V2 only)' }
    ]
  })
  const additionalFeatures: string[] = Array.isArray(additionalFeaturesRaw) ? additionalFeaturesRaw : []

  // Popup language selection (if popup is selected)
  let popupLang: 'html' | 'ts' | 'react' = 'html'
  if (additionalFeatures.includes('popup')) {
    const popupLangRaw = await select({
      message: 'Choose the language/technology for your popup:',
      options: [
        { value: 'html', label: 'Plain HTML/JS' },
        { value: 'ts', label: 'TypeScript' },
        { value: 'react', label: 'React (TSX)' }
      ]
    })
    if (typeof popupLangRaw === 'string') {
      popupLang = popupLangRaw as 'html' | 'ts' | 'react'
    }
  }

  // Background script language selection (if background script is selected)
  let backgroundLang: 'js' | 'ts' = 'js'
  if (additionalFeatures.includes('background')) {
    const backgroundLangRaw = await select({
      message: 'Choose the language for your background script:',
      options: [
        { value: 'js', label: 'Plain JavaScript' },
        { value: 'ts', label: 'TypeScript' }
      ]
    })
    if (typeof backgroundLangRaw === 'string') {
      backgroundLang = backgroundLangRaw as 'js' | 'ts'
    }
  }

  // Content script language selection (if content script is selected)
  let contentLang: 'js' | 'ts' = 'js'
  if (additionalFeatures.includes('content')) {
    const contentLangRaw = await select({
      message: 'Choose the language for your content script:',
      options: [
        { value: 'js', label: 'Plain JavaScript' },
        { value: 'ts', label: 'TypeScript' }
      ]
    })
    if (typeof contentLangRaw === 'string') {
      contentLang = contentLangRaw as 'js' | 'ts'
    }
  }

  // Option to use a src folder for source files
  const useSrcFolder = await confirm({ message: 'Do you want to use a "src" folder for your source files?' })

  // ---- Build & Dependency Options ----
  const buildOptionsRaw = await multiselect({
    message: 'Select additional build and dependency options:',
    options: [
      { value: 'package', label: 'Setup package.json with build scripts' },
      { value: 'bundler-webpack', label: 'Setup bundler: Webpack' },
      { value: 'bundler-rollup', label: 'Setup bundler: Rollup' },
      { value: 'jquery-npm', label: 'Include jQuery via npm' },
      { value: 'jquery-cdn', label: 'Include jQuery via CDN in HTML files' },
      { value: 'esmodules', label: 'Use ES Modules (import/export)' },
      { value: 'none', label: 'No build dependencies (skip package.json and bundlers)' }
    ]
  })
  const buildOptions: string[] = Array.isArray(buildOptionsRaw) ? buildOptionsRaw : []
  // If "none" is selected, override any other build options.
  if (buildOptions.includes('none')) {
    buildOptions.length = 0
  }

  // Confirm all settings
  const proceed = await confirm({ message: 'Proceed with these settings?' })
  if (!proceed) {
    outro('Aborted.')
    process.exit(0)
  }

  // Create the extension directory
  const extDir = path.join(process.cwd(), extensionName)
  if (fs.existsSync(extDir)) {
    console.error(chalk.red(`Directory "${extensionName}" already exists!`))
    process.exit(1)
  }
  fs.mkdirSync(extDir)

  // If using a src folder, create it
  if (useSrcFolder) {
    fs.mkdirSync(path.join(extDir, 'src'))
  }

  // Helper: Get file path based on useSrcFolder
  const filePath = (filename: string) =>
    path.join(extDir, useSrcFolder ? 'src' : '', filename)

  // Build manifest.json (placed at root)
  const manifest: any = {
    manifest_version: manifestVersion,
    name: extensionName,
    version: '1.0.0',
    description: extensionDescription,
    permissions: permissions
  }
  if (Object.keys(icons).length > 0) {
    manifest.icons = icons
  }

  // Background Script
  if (additionalFeatures.includes('background')) {
    if (manifestVersion === 3) {
      manifest.background = {
        service_worker: 'background.js',
        ...(buildOptions.includes('esmodules') && { type: 'module' })
      }
    } else {
      manifest.background = { scripts: ['background.js'], persistent: false }
    }
    const bgFileName = backgroundLang === 'ts' ? 'background.ts' : 'background.js'
    fs.writeFileSync(
      filePath(bgFileName),
      `// ${backgroundLang === 'ts' ? 'TypeScript' : 'JavaScript'} background script\nconsole.log('Background script running');\n`
    )
  }

  // Content Script
  if (additionalFeatures.includes('content')) {
    manifest.content_scripts = [{
      matches: ['<all_urls>'],
      js: ['content.js']
    }]
    const contentFileName = contentLang === 'ts' ? 'content.ts' : 'content.js'
    fs.writeFileSync(
      filePath(contentFileName),
      `// ${contentLang === 'ts' ? 'TypeScript' : 'JavaScript'} content script\nconsole.log('Content script injected');\n`
    )
  }

  // Options Page
  if (additionalFeatures.includes('options')) {
    let optionsHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Options</title>
</head>
<body>
  <h1>Extension Options</h1>
</body>
</html>\n`
    if (buildOptions.includes('jquery-cdn')) {
      optionsHTML = optionsHTML.replace(
        '</head>',
        `  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>\n</head>`
      )
    }
    fs.writeFileSync(filePath('options.html'), optionsHTML)
    if (manifestVersion === 3) {
      manifest.options_ui = { page: 'options.html', open_in_tab: true }
    } else {
      manifest.options_page = 'options.html'
    }
  }

  // DevTools Page (only for Manifest V2)
  if (additionalFeatures.includes('devtools') && manifestVersion === 2) {
    let devtoolsHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>DevTools</title>
</head>
<body>
  <h1>DevTools Page</h1>
</body>
</html>\n`
    if (buildOptions.includes('jquery-cdn')) {
      devtoolsHTML = devtoolsHTML.replace(
        '</head>',
        `  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>\n</head>`
      )
    }
    fs.writeFileSync(filePath('devtools.html'), devtoolsHTML)
    manifest.devtools_page = 'devtools.html'
  }

  // Popup Page
  if (additionalFeatures.includes('popup')) {
    if (manifestVersion === 3) {
      manifest.action = manifest.action || {}
      manifest.action.default_popup = 'popup.html'
    } else {
      manifest.browser_action = manifest.browser_action || {}
      manifest.browser_action.default_popup = 'popup.html'
    }

    let popupHTMLContent = ''
    if (popupLang === 'html') {
      popupHTMLContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Popup</title>
</head>
<body>
  <h1>Hello from Popup</h1>
  <script src="popup.js"${buildOptions.includes('esmodules') ? ' type="module"' : ''}></script>
</body>
</html>\n`
      fs.writeFileSync(filePath('popup.js'), `console.log('Popup JS loaded');\n`)
    } else if (popupLang === 'ts') {
      popupHTMLContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Popup</title>
</head>
<body>
  <h1>Popup (TypeScript)</h1>
  <!-- Compile popup.ts to popup.js -->
  <script src="popup.js"${buildOptions.includes('esmodules') ? ' type="module"' : ''}></script>
</body>
</html>\n`
      fs.writeFileSync(filePath('popup.ts'), `console.log('Popup TypeScript loaded');\n`)
    } else if (popupLang === 'react') {
      popupHTMLContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Popup</title>
</head>
<body>
  <div id="root"></div>
  <!-- Bundle popup.tsx to popup.js -->
  <script src="popup.js"${buildOptions.includes('esmodules') ? ' type="module"' : ''}></script>
</body>
</html>\n`
      fs.writeFileSync(filePath('popup.tsx'), `import React from 'react';
import ReactDOM from 'react-dom';

const App = () => {
  return <h1>Hello from React Popup!</h1>;
};

ReactDOM.render(<App />, document.getElementById('root'));
`)
    }
    if (buildOptions.includes('jquery-cdn')) {
      popupHTMLContent = popupHTMLContent.replace(
        '</head>',
        `  <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>\n</head>`
      )
    }
    fs.writeFileSync(filePath('popup.html'), popupHTMLContent)
  } else {
    if (manifestVersion === 3) {
      manifest.action = manifest.action || {}
    } else {
      manifest.browser_action = manifest.browser_action || {}
    }
  }

  // Write manifest.json at the root of the extension directory
  fs.writeFileSync(path.join(extDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

  // Setup package.json if build options are provided (unless "No build dependencies" was selected)
  if (buildOptions.length > 0) {
    const pkgPath = path.join(extDir, 'package.json')
    let pkg: any = {}
    if (fs.existsSync(pkgPath)) {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    }
    pkg.name = pkg.name || extensionName.toLowerCase().replace(/\s+/g, '-')
    pkg.version = pkg.version || '1.0.0'
    pkg.scripts = pkg.scripts || {}
    pkg.scripts.build = pkg.scripts.build || 'tsc'
    pkg.devDependencies = pkg.devDependencies || {}
    pkg.dependencies = pkg.dependencies || {}

    if (buildOptions.includes('bundler-webpack')) {
      pkg.devDependencies.webpack = pkg.devDependencies.webpack || '^5.0.0'
      pkg.devDependencies['webpack-cli'] = pkg.devDependencies['webpack-cli'] || '^4.0.0'
      if ((backgroundLang === 'ts' || contentLang === 'ts' || popupLang === 'ts' || popupLang === 'react') && !pkg.devDependencies.typescript) {
        pkg.devDependencies.typescript = '^4.9.5'
      }
    }
    if (buildOptions.includes('bundler-rollup')) {
      pkg.devDependencies.rollup = pkg.devDependencies.rollup || '^2.0.0'
      pkg.devDependencies['rollup-plugin-typescript2'] = pkg.devDependencies['rollup-plugin-typescript2'] || '^0.34.1'
      if ((backgroundLang === 'ts' || contentLang === 'ts' || popupLang === 'ts' || popupLang === 'react') && !pkg.devDependencies.typescript) {
        pkg.devDependencies.typescript = '^4.9.5'
      }
    }
    if (buildOptions.includes('jquery-npm')) {
      pkg.dependencies.jquery = pkg.dependencies.jquery || '^3.6.0'
      if (backgroundLang === 'ts' || contentLang === 'ts' || popupLang === 'ts' || popupLang === 'react') {
        pkg.devDependencies['@types/jquery'] = pkg.devDependencies['@types/jquery'] || '^3.5.14'
      }
    }
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
  }

  // ---- Generate TODO.md ----
  const todoLines: string[] = []
  todoLines.push('# TODO')
  todoLines.push('')
  todoLines.push('## Next Steps')
  if (additionalFeatures.includes('background')) {
    todoLines.push(`- Edit your background script (${backgroundLang === 'ts' ? 'background.ts' : 'background.js'}).`)
  }
  if (additionalFeatures.includes('content')) {
    todoLines.push(`- Edit your content script (${contentLang === 'ts' ? 'content.ts' : 'content.js'}).`)
  }
  if (additionalFeatures.includes('popup')) {
    if (popupLang === 'html') {
      todoLines.push('- Edit your popup HTML and JS files (popup.html and popup.js).')
    } else if (popupLang === 'ts') {
      todoLines.push('- Edit your popup files (popup.html and popup.ts) and compile to popup.js.')
    } else if (popupLang === 'react') {
      todoLines.push('- Edit your popup files (popup.html and popup.tsx) and bundle to popup.js.')
    }
  }
  if (additionalFeatures.includes('options')) {
    todoLines.push('- Edit your options page (options.html).')
  }
  if (additionalFeatures.includes('devtools') && manifestVersion === 2) {
    todoLines.push('- Edit your DevTools page (devtools.html).')
  }
  if (buildOptions.length > 0) {
    todoLines.push('- Run `npm install` in your extension directory to install build dependencies.')
    todoLines.push('- Build your extension (for example, run `npm run build`) after editing your TypeScript or bundler configuration.')
  } else {
    todoLines.push('- No build dependencies configured. Set up your build process manually if needed.')
  }
  todoLines.push('')
  todoLines.push('---')
  todoLines.push('Remember: Chrome extensions require JavaScript at runtime. If you write code in TypeScript or use ES modules, make sure to compile or bundle your code appropriately.')

  fs.writeFileSync(path.join(extDir, 'TODO.md'), todoLines.join('\n'))

  outro(chalk.green(`Chrome extension "${extensionName}" created successfully at ${extDir}!`))
}

main().catch((err) => {
  console.error(chalk.red(err))
  process.exit(1)
})
