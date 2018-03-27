#!/usr/bin/python2
# Note that running python with the `-u` flag is required on Windows,
# in order to ensure that stdin and stdout are opened in binary, rather
# than text, mode.

import sys, json, struct, os
import subprocess

# Read a message from stdin and decode it.
def getMessage():
  rawLength = sys.stdin.read(4)
  if len(rawLength) == 0:
      sys.exit(0)
  messageLength = struct.unpack('@I', rawLength)[0]
  message = sys.stdin.read(messageLength)
  return json.loads(message)

# Encode a message for transmission, given its content.
def encodeMessage(messageContent):
  encodedContent = json.dumps(messageContent)
  encodedLength = struct.pack('@I', len(encodedContent))
  return {'length': encodedLength, 'content': encodedContent}

# Send an encoded message to stdout.
def sendMessage(encodedMessage):
  sys.stdout.write(encodedMessage['length'])
  sys.stdout.write(encodedMessage['content'])
  sys.stdout.flush()


receivedMessage = getMessage()

msg = json.loads(receivedMessage)

cmd = msg['cmd']
shell = msg['shell']
wait = msg['wait']

use_shell = False
command = cmd
if shell:
  use_shell = True
  command = ' '.join(cmd)

devnull = open(os.devnull, 'w')
stdout = devnull
stderr = devnull
close_fds = True
if wait:
  stdout = subprocess.PIPE
  stderr = subprocess.PIPE
  close_fds = False

proc = subprocess.Popen(command, stdout = stdout, stderr = stderr, shell = use_shell, close_fds = close_fds)

if wait:
  stdout, stderr = proc.communicate()
  exit_code = proc.returncode
  msg = "command ran, exit status: %s, stderr: %s" % (exit_code, stderr)
else:
  msg = "async process launched, PID: %s" % proc.pid

sendMessage(encodeMessage(msg))
