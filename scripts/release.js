const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const rootDir = path.resolve(__dirname, '..')
const pkgPath = path.join(rootDir, 'package.json')
const updateJsonPath = path.join(rootDir, 'update.json')

function runCommand(cmd) {
  console.log(`> ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: rootDir })
}

function bumpVersion(current, type) {
  const parts = current.split('.').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid current version format: ${current}`)
  }
  let [major, minor, patch] = parts

  if (type === 'major') {
    major += 1
    minor = 0
    patch = 0
  } else if (type === 'minor') {
    minor += 1
    patch = 0
  } else if (type === 'patch' || !type) {
    patch += 1
  } else if (/^\d+\.\d+\.\d+$/.test(type)) {
    return type
  } else {
    throw new Error(
      `Invalid version target '${type}'. Use 'patch', 'minor', 'major', or an explicit version like '1.0.5'.`
    )
  }

  return `${major}.${minor}.${patch}`
}

function main() {
  const arg = process.argv[2]
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const currentVersion = pkg.version

  const targetVersion = bumpVersion(currentVersion, arg)
  const tag = `v${targetVersion}`

  console.log(`\n🚀 Preparing Release ${tag} (current: v${currentVersion})...\n`)

  // 1. Update package.json
  pkg.version = targetVersion
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  console.log(`✅ Updated package.json version to ${targetVersion}`)

  // 2. Update update.json if present
  if (fs.existsSync(updateJsonPath)) {
    try {
      const updateData = JSON.parse(fs.readFileSync(updateJsonPath, 'utf8'))
      updateData.version = targetVersion
      fs.writeFileSync(updateJsonPath, JSON.stringify(updateData, null, 2) + '\n', 'utf8')
      console.log(`✅ Updated update.json version to ${targetVersion}`)
    } catch (e) {
      console.warn('⚠️ Could not update update.json:', e.message)
    }
  }

  // 3. Git Add, Commit, Tag, and Push
  console.log('\n📦 Staging version files...')
  runCommand('git add package.json')
  if (fs.existsSync(updateJsonPath)) {
    runCommand('git add update.json')
  }

  try {
    runCommand(`git commit -m "release: ${tag}"`)
  } catch (err) {
    console.log('No new files to commit or commit already up to date.')
  }

  console.log(`🏷️ Creating tag ${tag}...`)
  runCommand(`git tag ${tag}`)

  console.log(`⬆️ Pushing commit and tag ${tag} to GitHub...`)
  runCommand(`git push origin main --tags`)

  console.log(`\n🎉 Release ${tag} successfully created and pushed to GitHub!`)
  console.log(`🤖 GitHub Actions is now building and releasing the installers automatically.`)
  console.log(`👉 Track build progress: https://github.com/Pritish229/Projectmanager/actions\n`)
}

try {
  main()
} catch (err) {
  console.error('\n❌ Release automation failed:', err.message)
  process.exit(1)
}
