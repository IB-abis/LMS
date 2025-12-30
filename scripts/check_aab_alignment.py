import zipfile,struct,sys
path=r'E:\LMS\android\app\build\outputs\bundle\release\app-release.aab'
Z=zipfile.ZipFile(path,'r')
entries=[zi for zi in Z.infolist() if zi.filename.startswith('base/lib/') and zi.filename.endswith('.so')]
print(f'Found {len(entries)} .so entries')
bad=[]
for zi in entries:
    with open(path,'rb') as f:
        f.seek(zi.header_offset)
        data=f.read(30)
        if len(data)<30:
            print('short header',zi.filename); continue
        sig=struct.unpack('<I',data[0:4])[0]
        if sig!=0x04034b50:
            print('bad LFH sig',zi.filename)
            continue
        name_len,extra_len=struct.unpack('<HH',data[26:30])
        data_offset=zi.header_offset+30+name_len+extra_len
        compress_type=zi.compress_type
        aligned=(data_offset % 16384)==0
        uncompressed=(compress_type==0)
        if not (aligned and uncompressed):
            bad.append((zi.filename,data_offset,compress_type,aligned,uncompressed))

print('\nSamples of failures (max 20):')
for b in bad[:20]:
    fn,off,ct,aligned,uncompressed=b
    print(f"{fn}: offset={off} compress_type={ct} aligned16k={aligned} uncompressed={uncompressed}")
print('\nSummary:')
print('Total entries:',len(entries))
print('Non-aligned/uncompressed count:',len(bad))
if len(bad)==0:
    print('All good: native libs are 16KB-aligned and uncompressed')
else:
    sys.exit(2)
