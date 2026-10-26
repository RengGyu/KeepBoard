"""Future approved AWS operations only; default invocation has no side effects."""
from pathlib import Path
import subprocess,json,hashlib,sys,ipaddress,time
O=Path(__file__).resolve().parent
if len(sys.argv)!=3 or sys.argv[1]!='--approved-create':raise SystemExit('Not executed: requires --approved-create ADMIN_IPV4/32 after exact A3 approval')
admin=ipaddress.ip_network(sys.argv[2],strict=True);assert admin.version==4 and admin.prefixlen==32 and admin.network_address.is_global
def call(*args):
 r=subprocess.run(['aws','lightsail',*args,'--region','ap-northeast-2','--output','json'],capture_output=True,text=True,check=True);return json.loads(r.stdout)
identity=json.loads(subprocess.run(['aws','sts','get-caller-identity','--output','json'],capture_output=True,text=True,check=True).stdout)
assert hashlib.sha256(identity['Account'].encode()).hexdigest()==json.loads((O/'account-check.json').read_text())['AWSAccountSHA256']
assert not any(i['name']=='keepboard-cloud' for i in call('get-instances')['instances'])
assert not any(i['name']=='keepboard-cloud-ip' for i in call('get-static-ips')['staticIps'])
b=next(b for b in call('get-bundles')['bundles'] if b['bundleId']=='micro_3_0');assert b['price']==7 and b['ramSizeInGb']==1 and b['diskSizeInGb']==40
# Stop if any API fails. Record completed resource creation; never delete somebody else's resource.
created=call('create-instances','--cli-input-json','file://'+str(O/'create-instance.json'))
(O/'aws-created-operations.json').write_text(json.dumps({'instanceNames':['keepboard-cloud'],'operations':created['operations']},indent=2)+'\n')
for attempt in range(90):
 state=call('get-instance','--instance-name','keepboard-cloud')['instance']['state']['name']
 if state=='running':break
 if state not in ['pending','running']:raise RuntimeError('New instance not running; inspect receipt, do not touch existing resources')
 time.sleep(5)
else:raise TimeoutError('New instance still pending; keep recorded resource for supervisor inspection')
call('allocate-static-ip','--static-ip-name','keepboard-cloud-ip')
call('attach-static-ip','--static-ip-name','keepboard-cloud-ip','--instance-name','keepboard-cloud')
ports=[{'fromPort':22,'toPort':22,'protocol':'tcp','cidrs':[str(admin)]}]+[{'fromPort':p,'toPort':p,'protocol':'tcp','cidrs':['0.0.0.0/0']} for p in [80,443]]
call('put-instance-public-ports','--instance-name','keepboard-cloud','--port-infos',json.dumps(ports))
ip=call('get-static-ip','--static-ip-name','keepboard-cloud-ip')['staticIp']['ipAddress']
receipt={'instance':'keepboard-cloud','staticIPName':'keepboard-cloud-ip','publicIPv4':ip,'origin':'https://'+ip,'region':'ap-northeast-2','monthlyInstanceUSD':7,'StoreTransferred':False,'secretRegistered':False,'VercelChanged':False}
(O/'aws-created.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
