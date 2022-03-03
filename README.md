# RunWith

Firefox webextension to run external programs on a link or selected text.

## Getting started

*NOTE: If you're upgrading from v0.14, along with the extension you also need to update `runwith.py` in whatever location you had it (if you were using it in the first place, that is).*

- Download and install the extension from [https://addons.mozilla.org/en-US/firefox/addon/run-with/](https://addons.mozilla.org/en-US/firefox/addon/run-with/) or from [the releases page](https://github.com/waldner/Firefox-RunWith/releases).

- Copy or symlink [**`runwith.json`**](https://github.com/waldner/Firefox-RunWith/blob/master/runwith.json)(the **NM manifest**) to the correct [Native Messaging manifest location for your OS](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_manifests); under Linux, you can use `~/.mozilla/native-messaging-hosts/runwith.json`. Under Windows, you mst create a registry key `HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\runwith`, whose value must be a `REG_SZ` containing the path to where you saved **`runwith.json`**. Save the following to a `.reg` file and import it:

```
Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\SOFTWARE\Mozilla\NativeMessagingHosts\runwith]
@="C:\\path\\to\\runwith.json"
```

- Copy [**`runwith.py`**](https://github.com/waldner/Firefox-RunWith/blob/master/runwith.py) somewhere and note down the full path of wherever you put it. **Make it executable (eg, `chmod +x /path/to/runwith.py`)**.

- (Windows only) Create the file `runwith.bat` with the following contents:

```
@echo off

python -u "c:\\path\\to\\runwith.py"

```

(or use `py` if you have the python launcher installed)


- **Linux**: Update the **`path`** key in the **NM manifest** with the actual path to where you put **`runwith.py`**. **Windows**: update the **`path`** key in the **NM manifest** with the actual path to where you put **`runwith.bat`**. Example (Linux):

```
  "path": "/path/to/runwith.py",
```

Example (Windows):

```
  "path": "c:\\path\\to\\runwith.bat",
```

- Configure the plugin by going to `about:addons` -> extensions -> RunWith -> Preferences. See below.

- Save the configuration.

- Right click on a hyperlink, selected text or image and (depending on the actual context) see the RunWith menu with the entries you configured in the previous step.

## Configuration

For each configuration line specify:

- The menu text for the entry (will be shown when you right-click)
- The NM host to use. Use **`runwith`** unless you know what you're doing.
- The context in which you want the menu entry to appear: `link`, `selection`, `image`, `editable`, `page`. `page` applies when none of the more-specific ones does.
- (Optional) The [documentUrlPatterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns), comma separated, where you want the menu to be shown; this refers to the document URL, ie the URL you see in the browser's address bar. By default, all URLs are enabled; in match pattern syntax, this means the value is `<all_urls>`.
- (Optional) The [targetUrlPatterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns), comma separated, for which you want the menu to be shown; this applies only to the `link` and `image` contexts, and refers to the link target or image source respectively. It is ignored for other contexts. By default, all URLs are enabled; in match pattern syntax, this means the value is `<all_urls>`.
- The actual command you want to run. **Separate words using commas**. Use the following special words to indicate the current link, selected text or image URL respectively: **`%%LINK%%`**, **`%%SELECTION%%`**, **`%%IMAGE%%`** (only the one appropriate for the context). At runtime, the **`%%WORD%%`** will be replaced with the actual link, selection or image URL value. Additionally, the **`%%TAB-URL%%`** and **`TAB-TITLE`** keywords are available in all contexts, and contain, as their name implies, the current tab's URL and title.
- Whether to run the command through a shell. This is normally needed only if you have special shell characters in the command (redirections, pipes, etc), and shouldn't be normally required.
- Whether you want the NM host program to wait for the command to finish or not. Unless you want to run graphical or detached commands, you should check this field. If the context is `editable`, this valued is ignored, as we must always wait for the command to complete to capture the output to send to the editable.

### Configuration example

**NOTE: when the extension is uninstalled, the configuration is removed from browser storage, so it's a good idea to export it to a file once you have it running.**

Create the following script in `/tmp/test.sh` (in real usage, this will be your scripts/program; here we just want to demostrate what values can be accessed, so we just dump everything):

```
#!/bin/bash

# write arguments to stdout or a file

if [ "$1" = "editable" ]; then
  echo "OUTPUT FOR EDITABLE FIELD"
fi

{
echo "Context: --$1--"
echo "%%LINK%%: $2--"
echo "%%SELECTION%%: --$3--"
echo "%%IMAGE%%: --$4--"
echo "%%TAB-URL%%: --$5--"
echo "%%TAB-TITLE%%: --$6--"
echo "------------------------"
} >> /tmp/output.txt
```

or, if you want a graphical view, you can do:

```
#!/bin/bash

if [ "$1" = "editable" ]; then
  echo "OUTPUT FOR EDITABLE FIELD"
fi

notify-send "Context: $1
%%LINK%%: $2
%%SELECTION%%: $3
%%IMAGE%%: $4
%%TAB-URL%%: $5
%%TAB-TITLE%%: $6
------------------------"
```

Make it executable:

```
chmod +x /tmp/test.sh
```

Under Windows, install [notify-send for Windows](http://vaskovsky.net/notify-send/) and create the following **`C:\test.bat`** program:

```
@echo off
set context=%1
set link=%2
set selection=%3
set image=%4
set taburl=%5
set tabtitle=%6

echo Context is "%context%"

set line=Context: -%context%-, link: -%link%-, selection: -%selection%-, image: -%image%-, taburl: -%taburl%-, tabtitle: -%tabtitle%-

if %context% == editable echo OUTPUT FOR EDITABLE FIELD

notify-send.exe "SUMMARY" %line%

```

Save [test_config.json](https://github.com/waldner/Firefox-RunWith/blob/master/test_config.json) (Linux) or [test_config_win.json](https://github.com/waldner/Firefox-RunWith/blob/master/test_config_win.json), and import it in RunWith configuration.

After importing, save the configuration.

Now go to a webpage, right-click on a link, selection or image (or on any point in the page), and you should see the corresponding RunWith menu entry. If you run it, you will see our test program being run and either writing its output to the editable focused field, the file `/tmp/output.txt`, or showing a notification popup, for notify-send. Of course this is just a silly example, but it demonstrates what can be accessed.

## Detailed explanation

The idea is that you want to use a hypertextual link, the selected text, or an image URL as arguments to external programs (ie, running on your computer/operating system).

WebExtensions provide a mechanism called [Native messaging](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_messaging) through which a browser addon can exchange messages with a so-called "Native messaging host", which, in short, is a piece of configuration (a JSON file) that identifies an external command as endpoint to send and receive NM messages. An example of NM manifest [is included in the repository](https://github.com/waldner/Firefox-RunWith/blob/master/runwith.json), here it is:

```
{
  "name": "runwith",
  "description": "Example host for native messaging",
  "path": "/path/to/runwith.py",
  "type": "stdio",
  "allowed_extensions": [ "run@runwith.run" ]
}

```

The important parts are the **`name`**, which uniquely identifies the NM host, the **`path`**, which points to the program that will be run by the browser to exchange NM messages, and the **`allowed_extensions`** which tells the NM host which extensions are allowed to talk to it (extensions are identified by their ID).

This NM manifest has to be copied or symlinked [to the correct location for your operating system](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Native_manifests), under Linux a suitable location is `~/.mozilla/native-messaging-hosts/<name>.json`, in our case thus `~/.mozilla/native-messaging-hosts/runwith.json`. Under Windows, a registry key must be created whose value is the location of the NM manifest (see above for an example).

A Python NM program that works the way the addon expects (**`runwith.py`**) [is included in the repo](https://github.com/waldner/Firefox-RunWith/blob/master/runwith.py), so you should copy it somewhere and update its path in the NM manifest. It should work with Python 2 and Python 3. Under Windows, it's necessary to create an extra `.bat` file that in turn calls `runwith.py`, and reference the `.bat` file in the NM manifest. If someone knows how to use `runwith.py` directly in the NM manifest under Windows, let me know.

**`runwith.py`** speaks the NM protocol, it expects to receive on stdin a JSON array with the command to run and its arguments, runs the command according to the user's shell/wait preferences, then writes back (to the extension) a brief summary of the execution (in case you're interested, it can be seen in the browser console, which can be opened with CTRL+SHIFT+J, along with other debugging messages output by the [**`background.js`**](https://github.com/waldner/Firefox-RunWith/blob/master/addon/background.js) script).

Inside `runwith.py`, you can set the **`enable_debug`** variable to `True` to dump the various incoming and outgoing messages it processes to a file (by default, `/tmp/runwith_debug.log`, see the `debug_file` variable).

#### What do "`shell`" and "`wait`" do exactly?

Let's assume you have a command like the following for an action in your configuration:

```
[ "yourcommand", "$foo", "bar", ">", "/tmp/a" ]
```

If `shell` is false (the recommended setting), the arguments you enter in the command configuration are passed verbatim to your code (modulo the `%%KEYWORD%%` substitutions, of course), so you can use basically any character and your program will receive it. In our example, the program will receive exactly `$foo`, `bar`, `>` and `/tmp/a` as arguments.

If `shell` is true, on the other hand, what gets executed is the equivalent of:

```
sh -c "yourcommand $foo bar > /tmp/a"
```

and in this case `$foo` and `>` are interpreted by the shell. **NOTE**: I have no idea what "shell" does under Windows.

`wait` is about waiting for the command to finish or not. If `wait` is true, `runwith.py` spawns your program and waits for it to finish, to collect its exit code and standard error (it'll be shown in the browser console). While your program is running, you'll see `runwith.py` also running in the process list. If your program has a definite lifetime (eg run, do something and terminate), it's recommended to set `wait` to true. If running a command in the `editable` context, wait is always true.

If `wait` is false, on the other hand, your program is spawned, but `runwith.py` terminates without waiting for it. This setting is recommended for graphical programs or script where it's not known in advance how long they will run.


## Bugs/Limitations

Only tested on Firefox under Linux, partially under Windows.

Almost certainly, the code can be improved. JS is really a shi^Wpeculiar language. Suggestions welcome.

