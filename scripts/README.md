# Scripts Directory

## Quick Start Scripts

### start-platform.sh
Starts both backend and frontend services manually.

**Usage:**
```bash
./scripts/start-platform.sh
```

Starts:
- Backend on port 3330
- Frontend on port 5370

---

### dev-reload.sh
Starts services with auto-reload on file changes.

**Usage:**
```bash
./scripts/dev-reload.sh
```

Both services will automatically restart when you edit files.

---

### stop-services.sh
Stops all Database Watcher services and frees ports.

**Usage:**
```bash
./scripts/stop-services.sh
```

---

## Service Files

### database-watcher-backend.service
Systemd service for the backend API.

**Install:**
```bash
sudo cp scripts/database-watcher-backend.service /etc/systemd/system/
sudo systemctl enable database-watcher-backend
sudo systemctl start database-watcher-backend
```

---

### database-watcher-frontend.service
Systemd service for the frontend UI.

**Install:**
```bash
sudo cp scripts/database-watcher-frontend.service /etc/systemd/system/
sudo systemctl enable database-watcher-frontend
sudo systemctl start database-watcher-frontend
```

---

### database-watcher-reload.service
Systemd service that watches for file changes and auto-reloads services.

**Install:**
```bash
sudo cp scripts/database-watcher-reload.service /etc/systemd/system/
sudo systemctl enable database-watcher-reload
sudo systemctl start database-watcher-reload
```

---

## Setup Scripts

### setup-services.sh
Sets up systemd services.

**Usage:**
```bash
./scripts/setup-services.sh
```

---

### check-services.sh
Checks if services are running on ports 3330 and 5370.

**Usage:**
```bash
./scripts/check-services.sh
```

---

## Legacy Files

These are from the old single-file version:

- `mongodb-watcher.service` - Old service file
- `reload-service.sh` - Old reload script

You can ignore these if using the new platform.
