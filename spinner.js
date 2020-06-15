#!/usr/bin/env node


let process = require('process')
let axios = require('axios')
let ora = require('ora')
let si = require('systeminformation')
let cb = require('clipboardy')

let stdinCheck = ora('Checking for a piped stdin').start();

if(Boolean(process.stdin.isTTY)) {
    stdinCheck.fail('Piped stdin failed. Make sure you are piping input in e.g. "some --bad command | fault"');
process.exit(1);  
}

stdinCheck.succeed('Found piped stdin');

let formatting = ora('Waiting for stdin to finish').start();

let data;

process.stdin.on('readable', () => {
  let chunk;
  // Use a loop to make sure we read all available data.
  while ((chunk = process.stdin.read()) !== null) {
    data += chunk;
    process.stdout.write(chunk);  
  }
  if(data == undefined) {
	  formatting.fail('stdin was empty. Double check your command')
	  process.exit(1)
  }
 });

process.stdin.on('end', async () => {
  	 formatting.succeed('Got everything from stdin');
	let sysdata = ora('Acquiring system data.').start();
	let info = await si.getAllData("");
	sysdata.succeed('Systemd data fetched');
  let sending = ora('sending log to container').start();
  let res;
  try {
	  res = await axios.post('http://pi.siwiec.us/fault/new', { text: data, info: JSON.stringify(info)})
  
  } catch(err) {
	sending.fail('server responsed with an error');
	process.exit(1);

  }
	if (await res.status != 200) sending.fail('server responded with an error');
  	try {
		cb.writeSync('http://' + res.data.url);
	sending.succeed('Sweet! Your environment is live at http://' + res.data.url + ' (copied to clipboard)\n\n') 
	} catch(err) {
	sending.succeed('Sweet! Your environment is live at http://' + res.data.url + '\n\n')
}});
