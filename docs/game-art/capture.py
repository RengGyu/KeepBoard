"""Temporary local art-only renderer receiver; exits after six checkpoint PNGs."""
import argparse, base64, http.server, pathlib, re, time

OUT=pathlib.Path(__file__).resolve().parents[2]/'public/game-art'
saved=set()
parser=argparse.ArgumentParser();parser.add_argument('--targets',default='020,040,060,080,100,120');options=parser.parse_args()
targets=set(options.targets.split(','));assert targets and targets<={'020','040','060','080','100','120'}
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(OUT),**kwargs)
 def log_message(self,*args):pass
 def do_POST(self):
  match=re.fullmatch(r'/capture/(020|040|060|080|100|120)',self.path)
  if not match:self.send_error(404);return
  length=int(self.headers.get('Content-Length','0'))
  if not 0<length<15_000_000:self.send_error(413);return
  body=self.rfile.read(length).decode()
  if not body.startswith('data:image/png;base64,'):self.send_error(400);return
  data=base64.b64decode(body.split(',',1)[1],validate=True)
  if not data.startswith(b'\x89PNG\r\n\x1a\n'):self.send_error(400);return
  file=OUT/'checkpoints'/(match[1]+'-representative.png');file.write_bytes(data)
  saved.add(match[1]);self.send_response(200);self.send_header('Content-Type','text/plain; charset=utf-8');self.end_headers();self.wfile.write(('saved '+str(file)).encode())
  print(f'SAVED {match[1]} {len(data)} bytes',flush=True)
server=http.server.HTTPServer(('127.0.0.1',0),Handler)
server.timeout=30
print('ART_RENDER_URL=http://127.0.0.1:'+str(server.server_port),flush=True)
deadline=time.monotonic()+7200
while not targets.issubset(saved) and time.monotonic()<deadline:server.handle_request()
server.server_close()
