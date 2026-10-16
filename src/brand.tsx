// Official EagleDesk logo (public/eagledesk-logo.jpg), shown unaltered on a white tile that matches its white background.
export const LOGO_SRC="/eagledesk-logo.jpg";
export function Eagle({size="md"}:{size?:"sm"|"md"|"lg"}){return <div className={`eagle eagle-${size}`}><img src={LOGO_SRC} alt="" width={1200} height={1214} decoding="async" draggable={false}/></div>}
export function Logo(){return <div className="logo"><Eagle size="sm"/><span>EagleDesk</span></div>}
