import type {ReactNode} from 'react';

export function InstagramLink({href,children,className=''}:{href:string;children?:ReactNode;className?:string}){
 if(!href||href.startsWith('['))return null;
 return <a className={`instagram-link ${className}`} href={href} target="_blank" rel="noopener noreferrer" aria-label={children?undefined:'Amanda on Instagram'}><img className="instagram-icon" src="/images/instagram.png" width="30" height="30" alt="" aria-hidden="true"/>{children&&<span>{children}</span>}</a>;
}
