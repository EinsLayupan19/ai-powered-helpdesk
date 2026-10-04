import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";

type IconName = "chat"|"calendar"|"users"|"bell"|"settings"|"search"|"plus"|"send"|"info"|"map"|"mail"|"phone"|"sun"|"moon"|"chevron"|"more"|"document"|"book"|"shield"|"logout"|"close"|"check";

const iconPaths: Record<IconName, ReactNode> = {
  chat:<><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></>,
  calendar:<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  users:<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  bell:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></>,
  settings:<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V21h-4v-.08A1.7 1.7 0 0 0 8.94 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06A1.7 1.7 0 0 0 8.94 4.6 1.7 1.7 0 0 0 10 3.08V3h4v.08a1.7 1.7 0 0 0 1.06 1.52 1.7 1.7 0 0 0 1.88-.34L17 4.2 19.83 7l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></>,
  search:<><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  plus:<path d="M12 5v14M5 12h14"/>,
  send:<><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
  info:<><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
  map:<><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  mail:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  phone:<path d="M22 16.9v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.34 1.78.65 2.63a2 2 0 0 1-.45 2.11L8.04 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.31 1.73.53 2.63.65A2 2 0 0 1 22 16.9Z"/>,
  sun:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>,
  moon:<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>,
  chevron:<path d="m9 18 6-6-6-6"/>,
  more:<><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  document:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></>,
  book:<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5Z"/><path d="M4 5.5v14A2.5 2.5 0 0 0 6.5 22H20"/></>,
  shield:<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>,
  logout:<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>,
  close:<path d="M18 6 6 18M6 6l12 12"/>,
  check:<path d="m20 6-11 11-5-5"/>
};

function Icon({name,size=20}:{name:IconName;size?:number}) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>;
}
function Button({children,variant="primary",icon,className="",...props}:{children?:ReactNode;variant?:"primary"|"secondary"|"ghost"|"danger"|"icon";icon?:IconName}&React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={"button button-"+variant+" "+className} {...props}>{icon&&<Icon name={icon}/>} {children}</button>;
}
function Eagle({size="md"}:{size?:"sm"|"md"|"lg"}) {
  return <div className={"eagle eagle-"+size}><svg viewBox="0 0 64 64" fill="none"><path d="M12 34c9-2 12-8 15-17 4 5 7 6 12 6 4 0 8-2 12-5-1 10-4 16-12 21l-7 13-5-12c-6-1-11-3-15-6Z" fill="currentColor"/><path d="M31 24c5 1 8 1 13-1-1 6-4 9-10 11l-3-10Z" fill="var(--surface)"/><circle cx="39" cy="26" r="1.7" fill="var(--ink)"/><path d="m44 29 8 2-8 3" fill="var(--accent-strong)"/></svg></div>;
}
function Logo(){return <div className="logo"><Eagle size="sm"/><span>EagleDesk</span></div>}
function Avatar({initials="AM"}:{initials?:string}){return <span className="avatar">{initials}</span>}

const conversations=[
  ["Enrollment Requirements","Here are the usual enrollment requirements…","9:42 AM"],
  ["Student ID","You’ll need an affidavit of loss.","Yesterday"],
  ["Clearance Process","Start by checking your account balance.","Mon"],
  ["Good Moral Certificate","You can request this from Student Affairs.","Oct 2"],
  ["School Calendar","Midterm examinations begin October 12.","Sep 29"],
  ["Academic Records","The Registrar handles official records.","Sep 21"],
  ["Cashier","Cashier hours are 8:00 AM–5:00 PM.","Sep 14"]
] as const;

const quick=[
  "What are the enrollment requirements?",
  "How do I get a replacement ID?",
  "When are the midterm exams?",
  "Where is the Cashier?"
];

function Sidebar({page,setPage,openProfile}:{page:string;setPage:(p:string)=>void;openProfile:()=>void}){
  const items:[string,string,IconName][]=[
    ["chats","Chats","chat"],["calendar","School Calendar","calendar"],["contact","Contact Staff","users"],["notifications","Notifications","bell"],["settings","Settings","settings"]
  ];
  return <aside className="sidebar"><div className="sidebar-logo"><Logo/></div><div className="nav-stack">
    {items.map(([id,label,icon])=><Button key={id} variant="ghost" className={"nav-button "+(page===id?"active":"")} onClick={()=>setPage(id)} aria-label={label}><Icon name={icon}/><span>{label}</span>{id==="notifications"&&<i className="nav-dot"/>}</Button>)}
  </div><Button variant="ghost" className={"profile-button "+(page==="profile"?"active":"")} onClick={openProfile}><Avatar/><span>Profile</span></Button></aside>;
}

function MobileNav({page,setPage}:{page:string;setPage:(p:string)=>void}){
  const items:[string,string,IconName][]=[["chats","Chats","chat"],["calendar","Calendar","calendar"],["contact","Contact","users"],["notifications","Alerts","bell"],["settings","Settings","settings"]];
  return <nav className="mobile-nav">{items.map(([id,label,icon])=><button key={id} className={page===id?"active":""} onClick={()=>setPage(id)}><Icon name={icon} size={19}/><span>{label}</span></button>)}</nav>;
}

function ConversationPanel({selected,onSelect,onNew}:{selected:string;onSelect:(x:string)=>void;onNew:()=>void}){
  const [q,setQ]=useState("");
  const list=conversations.filter(c=>(c[0]+" "+c[1]).toLowerCase().includes(q.toLowerCase()));
  return <aside className="conversation-panel">
    <div className="conversation-top"><div className="conversation-title"><strong>Conversations</strong><Button variant="icon" icon="plus" onClick={onNew} aria-label="New chat"/></div><label className="search"><Icon name="search" size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search conversations"/></label></div>
    <div className="conversation-list">{list.map(c=><button className={"conversation-row "+(selected===c[0]?"selected":"")} key={c[0]} onClick={()=>onSelect(c[0])}><Avatar initials="ED"/><div className="conversation-copy"><div className="conversation-meta"><strong>{c[0]}</strong><time>{c[2]}</time></div><span>{c[1]}</span></div></button>)}</div>
  </aside>;
}

function Chat({topic,onNew}:{topic:string;onNew:()=>void}){
  const initial=topic==="New conversation" ? [] : [
    {from:"user",text:topic==="Enrollment Requirements"?"What are the usual enrollment requirements?":topic==="Student ID"?"How do I get a replacement ID?":topic==="Clearance Process"?"How do I process my clearance?":"Hi! Can you help me with school information?"},
    {from:"ai",text:topic==="Enrollment Requirements"?"For enrollment, make sure you have no pending grades or outstanding balance. You can also check Student Automate for the current enrollment instructions. If you want, I can walk you through it step by step.":topic==="Student ID"?"For a replacement ID, prepare an affidavit of loss, submit it to the OSD, then proceed to the CSD for the replacement process.":"You can check the school information available in EagleDesk. I can help with enrollment, IDs, clearance, grades, school dates, and other common student concerns."}
  ];
  const [messages,setMessages]=useState(initial);
  const [value,setValue]=useState("");
  const send=(e:FormEvent)=>{e.preventDefault();if(!value.trim())return;const q=value.trim();setMessages(m=>[...m,{from:"user",text:q},{from:"ai",text:"I can help with that. Based on the school information available to EagleDesk, I’ll give you the relevant steps and office details. If the information needs confirmation, please contact the appropriate school office."}]);setValue("")};
  return <main className="chat-view">
    <header className="chat-header"><Eagle size="sm"/><div className="chat-identity"><strong>EagleDesk</strong><span><i/> School Helpdesk</span></div><div className="chat-actions"><Button variant="icon" icon="plus" onClick={onNew}/><Button variant="icon" icon="more"/></div></header>
    <div className="messages">{messages.length===0?<div className="welcome"><Eagle size="lg"/><h1>How can I help?</h1><p>Ask me about school services, requirements, offices, or the school calendar.</p><div className="suggestions">{quick.map(x=><button key={x} onClick={()=>setValue(x)}>{x}</button>)}</div></div>:<>{messages.map((m,i)=><div key={i} className={"message "+m.from}><Avatar initials={m.from==="ai"?"ED":"AM"}/><div><span className="message-name">{m.from==="ai"?"EagleDesk":"You"}</span><div className="bubble">{m.text}</div>{m.from==="ai"&&<div className="source"><Icon name="book" size={14}/> School information</div>}</div></div>)}</>}</div>
    <form className="composer" onSubmit={send}><input value={value} onChange={e=>setValue(e.target.value)} placeholder="Ask EagleDesk anything about school…"/><Button icon="send" aria-label="Send"/></form>
  </main>;
}

function CalendarPage(){
  const events=[["Oct 6","Deadline","Scholarship application"],["Oct 12–16","Exams","Midterm examinations"],["Oct 20","Event","University activity"],["Oct 31","Holiday","No classes"]];
  return <Page title="School Calendar" subtitle="Important academic dates and school events."><div className="calendar-layout"><section className="card calendar-card"><div className="calendar-head"><Button variant="icon" icon="chevron"/><strong>October 2026</strong><Button variant="icon" icon="chevron"/></div><div className="week">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><span key={d}>{d}</span>)}</div><div className="days">{Array.from({length:35},(_,i)=>{const n=i-4;return <div key={i} className={n===5?"today":""}>{n>0&&n<=31?n:""}</div>})}</div></section><section className="card"><h3>Upcoming</h3><div className="event-list">{events.map(e=><div className="event" key={e[0]}><strong>{e[0]}</strong><div><b>{e[1]}</b><span>{e[2]}</span></div></div>)}</div></section></div></Page>;
}

function ContactPage(){
  const staff=[["Student Affairs","General student concerns","studentaffairs@neu.edu.ph"],["Registrar","Academic records and documents","registrar@neu.edu.ph"],["Cashier","Payments and account concerns","cashier@neu.edu.ph"],["CICS Office","College-specific concerns","cics@neu.edu.ph"]];
  return <Page title="Contact Staff" subtitle="Find the right office for your concern."><div className="staff-grid">{staff.map(s=><div className="card staff-card" key={s[0]}><div className="staff-icon"><Icon name="users"/></div><h3>{s[0]}</h3><p>{s[1]}</p><div className="staff-contact"><span><Icon name="mail" size={16}/>{s[2]}</span><button><Icon name="phone" size={16}/>Contact</button></div></div>)}</div></Page>;
}

function NotificationsPage(){
  return <Page title="Notifications" subtitle="Updates and reminders from EagleDesk."><div className="notification-list"><div className="card notification unread"><div className="notification-icon"><Icon name="calendar"/></div><div><strong>Midterm examinations</strong><p>Midterm examinations are scheduled for October 12–16.</p><time>Today</time></div></div><div className="card notification"><div className="notification-icon"><Icon name="info"/></div><div><strong>Keep your school information updated</strong><p>Check Student Automate for official enrollment and account updates.</p><time>Yesterday</time></div></div></div></Page>;
}

function SettingsPage({dark,setDark}:{dark:boolean;setDark:(v:boolean)=>void}){
  return <Page title="Settings" subtitle="Manage your EagleDesk preferences."><div className="settings-card card"><Setting icon="sun" title="Appearance" desc="Choose how EagleDesk looks."><select value={dark?"dark":"light"} onChange={e=>setDark(e.target.value==="dark")}><option value="light">Light</option><option value="dark">Dark</option></select></Setting><Setting icon="bell" title="Notifications" desc="Receive useful school reminders."><button className="switch on"><span/></button></Setting><Setting icon="shield" title="Privacy" desc="Your conversations are personal to your account."><Icon name="chevron"/></Setting><Setting icon="logout" title="Sign out" desc="Sign out of this demo account."><Button variant="danger">Sign out</Button></Setting></div></Page>;
}
function Setting({icon,title,desc,children}:{icon:IconName;title:string;desc:string;children:ReactNode}){return <div className="setting-row"><div className="setting-icon"><Icon name={icon}/></div><div className="setting-copy"><strong>{title}</strong><p>{desc}</p></div><div className="setting-control">{children}</div></div>}

function ProfilePage(){return <Page title="Profile" subtitle="Your EagleDesk student profile."><div className="profile-card card"><Avatar/><div><h2>Alex Martinez</h2><p>Student • College of Informatics and Computing Studies</p><span className="profile-id">Student ID •••• 4821</span></div><Button variant="secondary">Edit profile</Button></div><div className="profile-sections"><div className="card"><h3>Account</h3><p>Use your school account for personalized helpdesk access.</p></div><div className="card"><h3>Help</h3><p>For official records or account changes, contact the appropriate school office.</p></div></div></Page>}

function Page({title,subtitle,children}:{title:string;subtitle:string;children:ReactNode}){return <main className="page"><header className="page-header"><div><h1>{title}</h1><p>{subtitle}</p></div><Avatar/></header>{children}</main>}

export default function App(){
  const [page,setPage]=useState("chats");
  const [topic,setTopic]=useState("Enrollment Requirements");
  const [dark,setDark]=useState(false);
  const select=(p:string)=>setPage(p);
  const newChat=()=>{setTopic("New conversation");setPage("chats")};
  const content=useMemo(()=>({calendar:<CalendarPage/>,contact:<ContactPage/>,notifications:<NotificationsPage/>,settings:<SettingsPage dark={dark} setDark={setDark}/>,profile:<ProfilePage/>}[page]),[page,dark]);
  return <div className={"app-shell "+(dark?"theme-dark":"")}><Sidebar page={page} setPage={select} openProfile={()=>setPage("profile")}/><div className="workspace">
    {page==="chats"?<><ConversationPanel selected={topic} onSelect={x=>setTopic(x)} onNew={newChat}/><Chat topic={topic} onNew={newChat}/></>:content}
  </div><MobileNav page={page} setPage={select}/></div>;
}
