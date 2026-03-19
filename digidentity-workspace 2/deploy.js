// deploy.js
// Usage: SUPABASE_URL=https://<project-ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service_role_key> node deploy.js
import fs from 'fs';
import path from 'path';
import process from 'node:process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createClient } = require('npm:@supabase/supabase-js@2.35.0');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) env vars are required.');
  process.exit(1);
}

const bucketName = 'app-static';
const possibleBuildDirs = ['dist', 'build', 'public', 'out', 'www'];

const run = async () => {
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  // 1) If package.json has build script, run it
  if (fs.existsSync('package.json')) {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (pkg.scripts && pkg.scripts.build) {
      console.log('Running npm run build...');
      const { spawnSync } = require('node:child_process');
      const build = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
      if (build.status !== 0) {
        console.error('Build failed. Aborting.');
        process.exit(build.status || 1);
      }
    } else {
      console.log('No build script found in package.json; will attempt to detect static folder.');
    }
  } else {
    console.log('No package.json found; will attempt to detect static folder.');
  }

  // 2) detect build directory
  let dir = null;
  for (const d of possibleBuildDirs) {
    if (fs.existsSync(d) && fs.statSync(d).isDirectory()) {
      dir = d;
      break;
    }
  }
  if (!dir) {
    // fallback: if index.html is in root
    if (fs.existsSync('index.html')) dir = '.';
    else {
      console.error('Could not find build output. Expected one of: ' + possibleBuildDirs.join(', ') + ' or root index.html. Exiting.');
      process.exit(1);
    }
  }
  console.log('Uploading files from:', dir);

  // 3) create bucket if not exists
  console.log('Ensuring bucket exists:', bucketName);
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error('Error listing buckets:', listErr);
    process.exit(1);
  }
  const exists = buckets.some(b => b.name === bucketName);
  if (!exists) {
    const { data: cb, error: createErr } = await supabase.storage.createBucket(bucketName, { public: true });
    if (createErr) {
      console.error('Failed to create bucket:', createErr);
      process.exit(1);
    }
    console.log('Bucket created:', cb.name);
  } else {
    console.log('Bucket exists.');
  }

  // 4) upload files recursively
  const walk = (dirPath) => {
    const results = [];
    const list = fs.readdirSync(dirPath);
    for (const file of list) {
      const full = path.join(dirPath, file);
      const stat = fs.statSync(full);
      if (stat && stat.isDirectory()) {
        const inner = walk(full).map(p => path.join(file, p));
        results.push(...inner);
      } else {
        results.push(path.relative(dirPath, path.join(dirPath, file)).replace(/\\\\/g, '/'));
      }
    }
    return results;
  };

  const absoluteDir = path.resolve(dir);
  const files = [];
  const gather = (p, base = '') => {
    for (const name of fs.readdirSync(p)) {
      const full = path.join(p, name);
      const rel = path.join(base, name).replace(/\\\\/g, '/');
      if (fs.statSync(full).isDirectory()) gather(full, rel);
      else files.push({ full, rel });
    }
  };
  gather(absoluteDir, '');

  console.log(`Found ${files.length} files, uploading...`);
  for (const f of files) {
    const objectName = f.rel;
    const fileBuffer = fs.readFileSync(f.full);
    const contentType = require('mime-types').lookup(objectName) || 'application/octet-stream';
    // upload
    const { data: uploadData, error: uploadErr } = await supabase.storage.from(bucketName).upload(objectName, fileBuffer, {
      cacheControl: 'public, max-age=31536000, immutable',
      upsert: true,
      contentType
    });
    if (uploadErr) {
      console.error('Upload error for', objectName, uploadErr);
      process.exit(1);
    }
    process.stdout.write('.');
  }
  console.log('\\nUpload complete.');

  // 5) Print public URL (CDN)
  // Supabase public URL format: https://<project-ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const baseUrl = supabaseUrl.replace(/\\/$/, '') + `/storage/v1/object/public/${bucketName}`;
  console.log('Your site is accessible at (index):', baseUrl + '/index.html');
  console.log('Directory base URL:', baseUrl);
  console.log('If you prefer to serve the root (index.html) as the site root, configure your app to request index.html or use a redirect rule in your hosting setup.');
  console.log('Privacy note: the script created the bucket as public so files are served via CDN. If you want stricter privacy (signed URLs only), delete the bucket and re-run and I will provide the signed URL variant.');
};

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
