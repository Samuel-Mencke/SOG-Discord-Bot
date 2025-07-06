# SOG Admin Bot

Ein vollständiger Discord Admin Bot mit erweiterten Moderations- und Verwaltungsfunktionen.

## 🚀 Features

### 🎫 Ticket System
- Automatisches Ticket-System mit Buttons
- Ticket-Logs für alle Aktionen
- Einfache Verwaltung durch Admins

### ⚠️ Warn System
- Warns vergeben und verwalten
- Warn-Historie pro User
- Moderator-Tracking

### 🎭 Rollenverwaltung
- Rollen einfach vergeben
- Berechtigungsprüfung

### 💥 Nuke System
- Channel komplett löschen (nur für Admins)
- Automatisches Recloning

### 📝 Logging System
- Message-Logs (gelöschte Nachrichten)
- Ticket-Logs (erstellt/geschlossen)
- Willkomensnachrichten

### 🎉 Willkomensnachrichten
- Automatische Begrüßung neuer Mitglieder
- Regelwerk-Akzeptierung über Buttons
- Clan-Bewerbung direkt aus der Willkomensnachricht

### 📋 Regelwerk-System
- Automatische Regelwerk-Anzeige
- Akzeptierung über Buttons
- Rollenvergabe nach Akzeptierung

### 📝 Bewerbungs-System
- Clan-Bewerbungen über Modal-Formulare
- Automatische Weiterleitung an Bewerbungskanal
- Annehmen/Ablehnen über Buttons
- Automatische Benachrichtigung per DM

## Commands

### Admin Commands
- `/warn @user [grund]` - Warn an User vergeben
- `/warns @user` - Warns eines Users anzeigen
- `/role @user Rollenname` - Rolle vergeben
- `/nuke` - Channel komplett löschen und neu erstellen
- `/setuptickets` - Ticket-System einrichten

### Moderator Commands
- `/warn @user [grund]` - Warn an User vergeben
- `/warns @user` - Warns eines Users anzeigen
- `/role @user Rollenname` - Rolle vergeben

### Allgemeine Commands
- `/ping` - Bot-Latenz testen
- `/regeln` - Server-Regeln anzeigen

## Setup

1. **Bot-Token ist bereits im Code eingetragen**

2. **Abhängigkeiten installieren:**
   ```
   npm install
   ```

3. **Bot starten:**
   ```
   node index.js
   ```

## Channel Setup

Erstelle folgende Channels für optimale Funktionalität:
- `welcome` oder `willkommen` - Für Willkomensnachrichten
- `ticket-logs` - Für Ticket-Logs
- `message-logs` - Für Message-Logs
- `bewerbungen` oder `applications` - Für Clan-Bewerbungen

## Rollen Setup

Erstelle folgende Rollen:
- `Verified` oder `Bestätigt` oder `Member` - Für User nach Regelwerk-Akzeptierung
- `Clan` oder `Member` - Für angenommene Clan-Bewerber

## Berechtigungen

Der Bot benötigt folgende Berechtigungen:
- Nachrichten senden
- Embed-Links senden
- Rollen verwalten
- Channels verwalten
- Mitglieder moderieren
- Nachrichten verwalten
- Direktnachrichten senden
- Slash Commands verwenden

## Datenbank

Der Bot speichert automatisch:
- Warns in `./data/warns.json`
- Ticket-Daten in `./data/tickets.json`
- Bewerbungen in `./data/applications.json`

## Workflow

1. **Neue User treten bei** → Willkomensnachricht mit Buttons
2. **Regelwerk akzeptieren** → Verified-Rolle erhalten
3. **Clan bewerben** → Bewerbungsformular → Admin-Review
4. **Ticket erstellen** → Support-System
5. **Moderation** → Warns, Rollen, Nuke-Funktionen

## Slash Commands

Alle Befehle funktionieren jetzt als moderne Slash Commands (/):
- `/warn` - Warn vergeben
- `/warns` - Warns anzeigen
- `/role` - Rolle vergeben
- `/nuke` - Channel nuken
- `/setuptickets` - Ticket-System einrichten
- `/regeln` - Regeln anzeigen
- `/ping` - Bot-Latenz testen 