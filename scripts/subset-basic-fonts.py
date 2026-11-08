"""Build optional fast-loading faces from the licensed Iosevka source faces.
Keep original faces as fallback; retain hinting and all applicable layout features.
Requires fonttools[woff].
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
root=Path(__file__).resolve().parents[1]
corpus=''.join(path.read_text(errors='ignore')for path in(root/'src').rglob('*')if path.suffix in ['.ts','.json','.css'])
extra=sorted({ord(char)for char in corpus if 0x2000<=ord(char)<=0x27bf}|{0xfeff,0xfffd})
ranges={'basic':[(0,255)]+[(point,point)for point in extra],'extended':[(0x100,0x24f),(0x1e00,0x1eff)]}
def unicode_ranges(points):
 groups=[]
 for point in sorted(points):
  if groups and point==groups[-1][1]+1:groups[-1]=(groups[-1][0],point)
  else:groups.append((point,point))
 return ','.join('U+%04X-%04X'%(a,b)for a,b in groups)
styles=['400','500','600','700','800','800-italic']
css=[]
records=[]
for kind,spans in ranges.items():
 for style in styles:
  source=root/'src/fonts'/('iosevka-'+style+'.woff2');font=TTFont(source,recalcTimestamp=False,recalcBBoxes=False);options=subset.Options();options.flavor='woff2';options.layout_features=['*'];subsetter=subset.Subsetter(options=options);points={point for start,end in spans for point in range(start,end+1)};subsetter.populate(unicodes=points);subsetter.subset(font);target=root/'src/fonts'/('iosevka-'+kind+'-'+style+'.woff2');font.save(target)
  original=TTFont(source);result=TTFont(target)
  for table,attributes in [('head',['xMin','xMax','yMin','yMax','unitsPerEm']),('hhea',['ascent','descent','lineGap']),('OS/2',['sTypoAscender','sTypoDescender','usWinAscent','usWinDescent'])]:
   for attribute in attributes:assert getattr(original[table],attribute)==getattr(result[table],attribute),(style,table,attribute)
  for point,name in result.getBestCmap().items():
   old=original.getBestCmap()[point];assert original['hmtx'].metrics[old]==result['hmtx'].metrics[name]
   assert list(original['glyf'][old].getCoordinates(original['glyf'])[0])==list(result['glyf'][name].getCoordinates(result['glyf'])[0])
  weight=style.split('-')[0];face='italic' if 'italic'in style else'normal';unicode=','.join('U+%04X-%04X'%(start,end)for start,end in spans);css.append('@font-face{font-family:Iosevka;font-style:'+face+';font-weight:'+weight+';font-display:swap;src:url(../fonts/'+target.name+') format("woff2");unicode-range:'+unicode+'}')
  records.append({'style':style,'subset':kind,'originalBytes':source.stat().st_size,'bytes':target.stat().st_size,'codepoints':len(result.getBestCmap()),'glyphMetricsAndOutlinesVerified':True});print(target.name,source.stat().st_size,'→',target.stat().st_size)
styles_path=root/'src/styles/fonts.css';source=styles_path.read_text();import re
covered={point for spans in ranges.values()for start,end in spans for point in range(start,end+1)}
for style in styles:
 original=TTFont(root/'src/fonts'/('iosevka-'+style+'.woff2'));remaining=set(original.getBestCmap())-covered
 pattern=r'@font-face\{[^}]+url\(\.\./fonts/iosevka-'+style+r'\.woff2\)[^}]*\}'
 source=re.sub(pattern,lambda match:re.sub(r';unicode-range:[^}]+','',match.group(0))[:-1]+';unicode-range:'+unicode_ranges(remaining)+'}',source)
source=re.sub(r'/\* fast faces begin \*/.*?/\* fast faces end \*/\n?', '',source,flags=re.S);marker=source.index('@font-face{font-family:Iosevka;font-style:normal;font-weight:400;font-display:swap;src:url(../fonts/iosevka-cyrillic-400.woff2)');styles_path.write_text(source[:marker]+'/* fast faces begin */\n'+'\n'.join(css)+'\n/* fast faces end */\n'+source[marker:])

import json
(root/'qa/upgrade/font-subsets.json').write_text(json.dumps(records,indent=2)+'\n')
