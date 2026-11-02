"""Public primary-source READS only. No model endpoints, weights, installs or secrets."""
from pathlib import Path
import json, subprocess, hashlib, tempfile
OUT=Path(__file__).resolve().parent
POINTER=OUT/'public-source-index.json'
REPOS=['Ziyang412/VideoTree','niki-amini-naieni/CountGD','PBalewski/CATAN-video-tracking','UZ-SLAMLab/ORB_SLAM3']

def fetch(url,path):
    p=subprocess.run(['curl','-q','--fail','--silent','--show-error','--location','--connect-timeout','12','--max-time','35','--max-filesize','8000000',url,'-o',str(path)],capture_output=True,text=True)
    if p.returncode: return {'url':url,'ok':False,'error':p.stderr[-600:],'exit':p.returncode}
    return {'url':url,'ok':True,'localPath':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size}

if __name__=='__main__':
    import sys
    if not POINTER.exists():
        root=Path(tempfile.mkdtemp(prefix='kb-fullscene-primary-',dir='/private/tmp'))
        index={'checked_on':'2026-11-01','root':str(root),'repositories':[],'files':[]}
        for repo in REPOS:
            stem=repo.replace('/','__')
            meta=fetch('https://api.github.com/repos/'+repo,root/(stem+'-repo.json'));index['files'].append(meta)
            if not meta['ok']:continue
            m=json.loads(Path(meta['localPath']).read_text());branch=m['default_branch']
            commit=fetch(f'https://api.github.com/repos/{repo}/commits/{branch}',root/(stem+'-commit.json'));index['files'].append(commit)
            if not commit['ok']:continue
            c=json.loads(Path(commit['localPath']).read_text());sha=c['sha']
            tree=fetch(f'https://api.github.com/repos/{repo}/git/trees/{sha}?recursive=1',root/(stem+'-tree.json'));index['files'].append(tree)
            index['repositories'].append({'repo':repo,'commit':sha,'license':m.get('license'),'treeFile':tree.get('localPath')})
        POINTER.write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n')
        print(json.dumps({'repositories':index['repositories'],'failed':[x for x in index['files'] if not x['ok']]}))
    elif len(sys.argv)==3:
        index=json.loads(POINTER.read_text());repo,path=sys.argv[1:];r=next(r for r in index['repositories'] if r['repo']==repo)
        assert path.endswith(('.py','.cc','.md','.txt','.json')) or path in ['LICENSE','LICENSE.txt']
        destination=Path(index['root'])/(repo.replace('/','__')+'__'+path.replace('/','__'))
        row=fetch(f'https://raw.githubusercontent.com/{repo}/{r["commit"]}/{path}',destination);row.update({'repo':repo,'path':path,'commit':r['commit']})
        index['files'].append(row);POINTER.write_text(json.dumps(index,ensure_ascii=False,indent=2)+'\n');print(json.dumps(row))
    else:
        raise SystemExit('Metadata already frozen. Optional arguments: exact repo and source path.')
