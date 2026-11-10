export function sortedBanners(items){return [...items].sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)||String(a.id).localeCompare(String(b.id)))}
export function safeBannerLink(value){if(/^#[A-Za-z0-9/_-]{1,150}$/.test(value||''))return value;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:''}catch{return ''}}
export function publicBannerItems(items){return sortedBanners(items.filter(item=>item.published===true&&typeof item.imageUrl==='string'&&item.imageUrl.startsWith('https://')))}
