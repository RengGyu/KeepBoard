import json,time,hashlib,pathlib
import numpy as np,onnxruntime as ort
from PIL import Image
P=pathlib.Path('/private/tmp/kb-dice-research-20261102');classes=json.load(open(P/'classes.json'))['classes'];sess=ort.InferenceSession(str(P/'dice-value-cls.onnx'),providers=['CPUExecutionProvider']);out=[];t=time.monotonic()
for r in json.load(open(P/'crops.json')):
 a=np.asarray(Image.open(r['path']).convert('RGB'),dtype=np.float32)/255.;a=(a-np.array([.485,.456,.406],dtype=np.float32))/np.array([.229,.224,.225],dtype=np.float32);scores=sess.run(None,{'images':a.transpose(2,0,1)[None]})[0][0];indices=[i for i,c in enumerate(classes)if c.startswith('d6_')];di=max(indices,key=lambda i:float(scores[i]));out.append({'id':r['id'],'topClass':classes[int(scores.argmax())],'d6Class':classes[di],'score':float(scores[di])})
json.dump({'modelSHA':hashlib.sha256((P/'dice-value-cls.onnx').read_bytes()).hexdigest(),'seconds20Crops':time.monotonic()-t,'rows':out},open('docs/dice-research-20261102/local-classifier.json','w'),indent=2);print(out)
