# PolyGen — Live Disk Owners

This project displays the **current owners of PolyGen Disks** in a real-time HTML table.

- There are different versions of this Website:
<br>All require a small Node.js WebSocket proxy, that makes it possible for the browser to talk to the MQTT broker.

  - **PolyGenDiskStatusWHY2025**
    <br>Data is streamed via **MQTT** from the PolyGen server and updated instantly in the browser. <br>
 <br> **`DiskOwners(Teams).html`** shows the current Status of a disk:
      - Disk ID
      - Disk Name
      - Owner (Team)
      - Position (x,y)
      - Last Update
      - Last Team Change
      - Last claimed by
   
    <br>**`DiskOwners(Teams+Player).html`** shows additionally the player name that last captured/discoverd/boosted this disk. <br>
   <br>**`teams+size.html`** shows the current teams and thier size.

  - **PolyGenDiskStatusWHY2025withexpress**
    <br>Data is streamed via **MQTT** from the PolyGen server and saved in `state.json` on the server to presist the state.
    <br>Data is then requested from the Website via REST API endpoint via live polling.
    <br>Client connection logging with IP and device information (only first-time connections per IP are logged)
    


---

## Overview
### PolyGenDiskStatusWHY2025
- **Frontend (HTML/JS)**  
  - Displays disks with owner, position, timestamps and playername
  - Real-time updates via MQTT-over-WebSocket  
  - Filter by team  
  - Team colors shown as table background
  - Connection status indicator (green/red dot).
  - Auto-reconnect if the connection drops.
  - Works entirely in the browser — no backend required.

- **Backend (Node.js Proxy)**  
  - Translates MQTT (TCP) into MQTT-over-WebSocket for browser clients  
  - Connects to an external MQTT broker (e.g. `mqtt.gen.polyb.io:1883`)  
  - No own data cache — relies on *Retained Messages* from the broker

 ### PolyGenDiskStatusWHY2025withexpress
- **Frontend (HTML/JS)**
  - Same as **PolyGenDiskStatusWHY2025**

- **Backend (Node.js Proxy + express(json))**  
  - Same as **PolyGenDiskStatusWHY2025**
  - Data is stored at the backend, same for every client
  - Data presists if the Server is down.
<br><br> Folder Structure
<br>├── public/
<br>│ └── index.html # Frontend dashboard
<br>├── server.js # Express + MQTT backend
<br>├── state.json # Saved state data (auto-generated)
 
---

## Required Packages
For the proxy:
```bash
npm install mqtt ws aedes
node MQTTProxy.js / server.js
````

For the webserver (only needed for `PolyGenDiskStatusWHY2025`):
```bash
npm install -g http-server
cd /path/to/serverFolder
http-server -p 8080
```

For express (only needed for `PolyGenDiskStatusWHY2025withexpress`)
```bash
npm install express
````

##Map
The `WHY2025Map.png` can be used to find all the Disks via x and y coordinates (Pixel).[^1]
[^1]: This is not the original map but quite close in the dimensions and map excerpt.



## Links
<br>Info Polygen: https://gen.polyb.io/
<br>Polygen@WHY2025: https://gen.polyb.io/posts/WHY2025/
<br>WHY2025: https://why2025.org/
<br>MQTT Doku: https://gen.polyb.io/posts/DataFeed/
<br>Github Project of the Game: https://github.com/Trikkitt/polygen

## License
MIT License – Feel free to use and modify this project.