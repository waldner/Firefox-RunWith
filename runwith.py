#!/usr/bin/python

# Note that running python with the `-u` flag is required on Windows,
# in order to ensure that stdin and stdout are opened in binary, rather
# than text, mode.

import sys, json, struct, os
import subprocess

def debug(msg):
  if enable_debug:
    with open(debug_file, 'a') as outfile:
      outfile.write(msg)
      outfile.write("\n")

# Read a message from stdin and decode it.
def getMessage():
  rawLength = our_stdin.read(4)
  if len(rawLength) == 0:
      sys.exit(0)
  messageLength = struct.unpack('@I', rawLength)[0]
  debug("getMessage: messageLength is %s" % messageLength)
  message = our_stdin.read(messageLength).decode('utf-8')
  debug("getMessage: message is %s" % message)
  return json.loads(message)

# Encode a message for transmission, given its content.
def encodeMessage(messageContent):
  debug("encodeMessage: messageContent is %s" % messageContent)
  encodedContent = json.dumps(messageContent)
  debug("encodeMessage: encodedContent is %s\n" % encodedContent)
  encodedLength = struct.pack('@I', len(encodedContent))
  debug("encodeMessage: encodedLength is %s" % encodedLength)
  return {'length': encodedLength, 'content': encodedContent.encode()}

# Send an encoded message to stdout.
def sendMessage(encodedMessage):

  debug("sendMessage: encodedMessage is %s" % encodedMessage)
  debug("sendMessage: encodedMessage['length'] is %s" % encodedMessage['length'])
  debug("sendMessage: encodedMessage['content'] is %s" % encodedMessage['content'])

  our_stdout.write(encodedMessage['length'])
  our_stdout.write(encodedMessage['content'])
  our_stdout.flush()

# determine Python version
python_version = sys.version_info[0]   # should be 2 or 3

if python_version == 2:
  our_stdin = sys.stdin
  our_stdout = sys.stdout
else:
  our_stdin = sys.stdin.buffer
  our_stdout = sys.stdout.buffer


# set this to true to dump things to the debug_file
enable_debug = False
debug_file = "/tmp/runwith_debug.log"

receivedMessage = getMessage()
debug("main: receivedMessage is %s" % receivedMessage)

cmd = receivedMessage['cmd']
shell = receivedMessage['shell']
wait = receivedMessage['wait']

use_shell = False
command = cmd
if shell:
  use_shell = True
  command = ' '.join(cmd)

devnull = open(os.devnull, 'w')
child_stdout = devnull
child_stderr = devnull
close_fds = True
if wait:
  child_stdout = subprocess.PIPE
  child_stderr = subprocess.PIPE
  close_fds = False

proc = subprocess.Popen(command, stdout = child_stdout, stderr = child_stderr, shell = use_shell, close_fds = close_fds)

msg = { 'pid': proc.pid, 'shell': use_shell, 'wait': wait }

if wait:
  stdout, stderr = proc.communicate()
  exit_code = proc.returncode
  msg['exit-status'] = exit_code
  msg['stderr'] = stderr.decode()
else:
  msg['exit-status'] = 'N/A'
  msg['stderr'] = 'N/A'

sendMessage(encodeMessage(msg))
