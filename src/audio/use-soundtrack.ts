import { useEffect } from "react";
import { soundtrack } from "./music";

let interacted = false;
/** Mount once at the app root so changing screens never layers another soundtrack. */
export function useSoundtrack(muted: boolean) {
  useEffect(()=>{
    const start=()=>{if(!muted&&!document.hidden)void soundtrack.start();};
    const gesture=()=>{interacted=true;start();};
    const visibility=()=>{if(document.hidden)soundtrack.stop();else if(interacted)start();};
    document.addEventListener("pointerdown",gesture);
    document.addEventListener("keydown",gesture);
    document.addEventListener("visibilitychange",visibility);
    if(muted)soundtrack.stop();else if(interacted)start();
    return ()=>{
      document.removeEventListener("pointerdown",gesture);document.removeEventListener("keydown",gesture);
      document.removeEventListener("visibilitychange",visibility);soundtrack.stop();
    };
  },[muted]);
}
