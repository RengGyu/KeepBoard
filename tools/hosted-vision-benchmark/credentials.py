"""Add only Roboflow via hidden input; preserve any existing Gemini entry."""
import argparse
import getpass
import os
from pathlib import Path
import re
import tempfile
from runner import DEFAULT_CREDENTIAL_FILE,credential_file,encoded,fields,private_path,strict_json


def store_roboflow(path,value):
    path=private_path(path)
    if not isinstance(value,str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,1024}',value):raise ValueError('Invalid Roboflow credential; no value logged')
    original=credential_file(path) if path.exists() else None
    body=strict_json(original) if original is not None else {}
    fields(body,[],['GEMINI_API_KEY','ROBOFLOW_API_KEY'])
    body['ROBOFLOW_API_KEY']=value
    path.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    if path.parent.stat().st_mode&0o077:raise ValueError('Credential parent directory must be0700')
    fd,temporary=tempfile.mkstemp(prefix='.credentials-',dir=path.parent)
    try:
        with os.fdopen(fd,'wb') as output:output.write(encoded(body))
        if original is None:
            # Atomic exclusive publication; never overwrite a concurrently created store.
            os.link(temporary,path)
        else:
            if credential_file(path)!=original:raise ValueError('Credential store changed; retry manually')
            os.replace(temporary,path)
    finally:
        if os.path.exists(temporary):os.unlink(temporary)
    return path


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--file',type=Path,default=DEFAULT_CREDENTIAL_FILE)
    args=parser.parse_args()
    if not os.isatty(0):parser.error('Use an interactive terminal; hidden input is required')
    value=getpass.getpass('ROBOFLOW_API_KEY (hidden): ')
    path=store_roboflow(args.file,value)
    print('Saved ROBOFLOW_API_KEY in private file: '+str(path))
    print('Existing Gemini entry preserved; no authentication or inference was run.')


if __name__=='__main__':
    try:main()
    except ValueError as error:raise SystemExit(str(error))
