Coach Roche —

Got your note. Let's get you in.

**Try this first:** go directly to `https://app.grittyfb.com` (not `grittyfb.com`). The app lives on that subdomain, so the bare address won't always land you in the right place.

**If that still doesn't load:** it's almost certainly Belmont Hill's network filter. Quick way to confirm — pull up `https://app.grittyfb.com` on your phone with WiFi turned off (cellular only). If it works on cellular but not on campus WiFi, that's your answer.

**For Belmont Hill IT** — forward them this block and ask them to whitelist:

```
Required (the app needs all of these to work):
  - grittyfb.com
  - www.grittyfb.com
  - app.grittyfb.com
  - *.supabase.co

Optional (recommended but app degrades gracefully if blocked):
  - fonts.googleapis.com
  - fonts.gstatic.com
  - *.basemaps.cartocdn.com
```

Happy to jump on a quick call if it's easier — or talk to your IT directly if that moves it faster. BC High guy here, so I know the world.

Chris
