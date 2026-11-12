import {useRef,type ClipboardEvent} from 'react';

// TEST_ONLY clipboard-photo-paste. Remove this file and its SessionWorkspace DEV gate before release.
export function clipboardImageFiles(data:Pick<DataTransfer,'files'|'items'>):File[]{
 const files=Array.from(data.files).filter(file=>file.type.startsWith('image/'));
 if(files.length)return files;
 return Array.from(data.items).filter(item=>item.kind==='file'&&item.type.startsWith('image/')).flatMap(item=>{const file=item.getAsFile();return file?[file]:[];});
}

export function ClipboardPhotoPaste({enabled,disabled,onFiles}:{enabled:boolean;disabled:boolean;onFiles:(files:File[])=>Promise<void>}){
 const inFlight=useRef(false);
 if(!enabled)return null;
 async function paste(event:ClipboardEvent<HTMLDivElement>){
  if(!enabled||disabled||inFlight.current)return;
  const files=clipboardImageFiles(event.clipboardData);if(!files.length)return;
  event.preventDefault();inFlight.current=true;
  try{await onFiles(files);}finally{inFlight.current=false;}
 }
 return <div className="panel" data-test-only="clipboard-photo-paste" role="group" aria-label="테스트 전용 사진 붙여넣기" aria-disabled={disabled} tabIndex={disabled?-1:0} style={{borderStyle:'dashed'}} onClick={event=>{if(!disabled)event.currentTarget.focus();}} onPaste={paste}>
  <strong>테스트 전용 · 사진 붙여넣기</strong><p className="small muted">이미지를 복사한 뒤 여기를 누르고 Cmd+V / Ctrl+V를 눌러 주세요. 사진 추가와 같은 방식으로 저장해요.</p>
 </div>;
}
