// ============================================================================
// REMOVED: Node.js Express backend (port 3000)
// ============================================================================
// This backend has been removed from the project. The PetStore app is served
// by the FastAPI backend in /backend (uvicorn, port 8000), which the Vite
// dev server proxies to via vite.config.js.
//
// To fully clean up, delete this file and the whole /server directory:
//
//   PowerShell: Remove-Item index.js, auth.js, cart.js, consultations.js, contact.js; Remove-Item -Recurse -Force server
//   cmd:        del index.js auth.js cart.js consultations.js contact.js && rmdir /s /q server
//
// History: this was the Express entry that mounted pets, foods, auth, cart,
// consultations and contact routers backed by the sql.js database in /server.
