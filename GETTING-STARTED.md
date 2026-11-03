# Trying out Bridgephone on your own computer

This guide explains, step by step, how to get Bridgephone running on a computer with **Linux Mint**. You don't need to know anything about programming. It takes about 15 minutes, most of which is waiting for things to download.

You will type a few commands into the **Terminal**. That's a window where you type instructions instead of clicking. For each step, copy the grey block of text, paste it into the Terminal and press **Enter**.

> **Tip:** in the Terminal, pasting is **Ctrl + Shift + V**, not Ctrl + V.

---

## Step 1: Open the Terminal

Click the menu at the bottom left of the screen, type `terminal` and click **Terminal**. A dark window opens.

## Step 2: Install the tools Bridgephone needs

Bridgephone needs two programs: **Git** (to download Bridgephone) and **Docker** (to run it). Paste this:

```
sudo apt update && sudo apt install -y git docker.io docker-compose-v2
```

The Terminal asks for **your password**: the one you use to log in to the computer. While you type it, nothing appears on screen, not even dots. That's normal. Type it and press Enter.

Wait until the text stops scrolling and you can type again.

## Step 3: Give yourself permission to use Docker

Paste this:

```
sudo usermod -aG docker $USER
```

Now **restart the computer**. This is needed for the permission to take effect. After restarting, open the Terminal again (see step 1).

## Step 4: Download Bridgephone

Paste this:

```
git clone https://github.com/bridgephone/bridgephone.git
```

This creates a folder called `bridgephone` in your home folder.

> If it asks for a username and password, ask Lodewijk to give you access, or ask him for a zip file of the project instead. Unzip that into your home folder, so you get a folder called `bridgephone`, and carry on with step 5.

## Step 5: Fill in your settings

Paste these two lines (press Enter after each):

```
cd ~/bridgephone
cp .env.example .env
```

Now open the settings file in the text editor:

```
xed .env
```

A text editor opens. Change two lines:

1. Find the line `SITE_ADMINS=you@example.com` and replace `you@example.com` with **your own email address**. This makes you the person in charge of the app.
2. Check that the line `DEV_LOGIN=true` is there. It lets you log in with just your email address, without setting up Google.

Save the file (**Ctrl + S**) and close the editor.

## Step 6: Start Bridgephone

Make sure you are still in the `bridgephone` folder, and paste:

```
cd ~/bridgephone
docker compose up -d --build
```

The first time this takes several minutes, because it downloads and prepares everything. When you can type again and the last lines say **Started**, it's running.

## Step 7: Open Bridgephone

Open your web browser (Firefox, for example) and go to:

**http://localhost:3000**

You will see the login page. Type the email address you entered in step 5 and click **Log in**.

### What to do first

1. On the **Clubs** page, create a club, for example "Test club".
2. Click on the club and add some members: their email addresses, and names if you like.
3. Create a tournament, form pairs, and fill in the schedule.
4. To try things out as a player, click **Log out** and log in again with one of the members' email addresses.

---

## Using it on your phone

Bridgephone is made for phones. You can try it on your phone, as long as the phone is on the **same wifi** as the computer.

1. On the computer, paste this into the Terminal:
   ```
   hostname -I
   ```
   It shows one or more numbers like `192.168.1.23`. The first one is your computer's address.
2. On your phone, open the browser and go to that address followed by `:3000`, for example **http://192.168.1.23:3000**.

> Note: while it runs, anyone on your wifi can open Bridgephone and log in with just an email address. That's fine at home for trying it out, but don't do this on a public wifi network.

---

## Everyday use

Open the Terminal and go to the folder first:

```
cd ~/bridgephone
```

Then use one of these:

| What you want | Paste this |
| --- | --- |
| Stop Bridgephone | `docker compose down` |
| Start it again | `docker compose up -d` |
| Get the newest version | `git pull` and then `docker compose up -d --build` |

Your clubs, members and tournaments are kept when you stop and start Bridgephone, and also when you restart the computer. Bridgephone doesn't start by itself after a restart, so start it again with `docker compose up -d`.

---

## If something goes wrong

**"permission denied" when running `docker compose`**
The permission from step 3 hasn't taken effect yet. Restart the computer and try again.

**"no configuration file provided" or "not found"**
You are not in the `bridgephone` folder. Paste `cd ~/bridgephone` first.

**The page at http://localhost:3000 doesn't open**
Bridgephone may still be starting up. Wait a minute and refresh the page. If it still doesn't work, paste:
```
docker compose logs app
```
and send the text it shows to Lodewijk.

**"is not a member of any club" when logging in**
Use exactly the email address you entered in step 5, or one you added as a member of a club.

**Starting over with an empty app**
This **deletes all clubs, members and tournaments**:
```
docker compose down -v
docker compose up -d
```
