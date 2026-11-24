'use strict';

const repository = 'Joao-Oliveira-PGE/SPA-MCP-Downloads';

function downloadCandidate(release) {
  if (release.draft !== false || release.prerelease !== true || release.immutable !== true) return null;
  try {
    const feed = JSON.parse(release.body);
    const version = /^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/.exec(feed.version);
    if (!version || feed.schema !== 1 || feed.channel !== 'public-beta' || feed.operational !== false ||
        !/^[a-f0-9]{64}$/.test(feed.sha256) || !/^[a-f0-9]{40}$/.test(feed.revision) ||
        !Number.isSafeInteger(feed.run_id) || feed.run_id <= 0 ||
        !Number.isSafeInteger(feed.size) || feed.size <= 0 || feed.size >= 1024 ** 3 ||
        release.tag_name !== 'public-beta-'+feed.version) return null;
    const name = 'SPA-MCP-Setup-'+feed.version+'.exe';
    const assets = release.assets.filter(asset => asset.name === name);
    if (assets.length !== 1 || assets[0].size !== feed.size || assets[0].digest !== 'sha256:'+feed.sha256) return null;
    return {version: feed.version, order: version.slice(1).map(Number), sha256: feed.sha256,
      url: 'https://github.com/'+repository+'/releases/download/'+release.tag_name+'/'+name};
  } catch {
    return null;
  }
}

async function showDownload() {
  const status = document.getElementById('download-status');
  status.textContent = 'Consultando a versão disponível…';
  try {
    const response = await fetch('https://api.github.com/repos/'+repository+'/releases?per_page=20', {
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error('GitHub indisponível');
    const releases = await response.json();
    const available = releases.map(downloadCandidate).filter(Boolean).sort((left, right) => {
      for (let index = 0; index < left.order.length; index++) {
        const difference = right.order[index] - left.order[index];
        if (difference) return difference;
      }
      return 0;
    });
    if (!available.length) {
      status.textContent = 'A primeira Beta pública aguarda publicação.';
      return;
    }
    const latest = available[0];
    const download = document.getElementById('download');
    download.href = latest.url;
    download.textContent = 'Baixar instalador';
    status.textContent = 'Versão '+latest.version;
    document.getElementById('digest').textContent = latest.sha256;
    document.getElementById('checksum').hidden = false;
  } catch {
    status.textContent = 'A consulta automática está indisponível. Confira as versões no GitHub.';
  }
}

showDownload();
