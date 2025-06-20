import express from 'express';
import { spawn } from 'child_process';
import cors from 'cors';
import os from 'os'; // ADD this to detect OS

const app = express();
app.use(express.json());
app.use(cors());

app.post('/api/author', async (req, res) => {
  const { nomComplet } = req.body;

  if (!nomComplet) {
    return res.status(400).json({ error: 'Full name is required' });
  }

  const nameParts = nomComplet.trim().split(/\s+/);
  if (nameParts.length < 2) {
    return res.status(400).json({ error: 'Please provide both first and last names' });
  }

  const firstname = nameParts[0];
  const lastname = nameParts.slice(1).join(' ');

  try {
    console.log(`Processing author: ${firstname} ${lastname}`);
    
    // Correct: dynamically use names here
    const mergedData = await runPythonScript('merge_pub.py', [firstname, lastname]);

    console.log('Data processing complete');
    
    res.json({
      success: true,
      data: mergedData,
      message: `Publication data for ${nomComplet} has been successfully retrieved and processed.`
    });

  } catch (error) {
    console.error('Error running Python scripts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch data from Python scripts',
      details: error.toString()
    });
  }
});

function runPythonScript(scriptName, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running Python script: ${scriptName} with args: ${args.join(' ')}`);
    
    const pythonCommand = os.platform() === 'win32' ? 'python' : 'python3'; // auto detect

    const python = spawn(pythonCommand, [scriptName, ...args]);

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      const chunk = data.toString();
      console.log(`Python stdout: ${chunk}`);
      output += chunk;
    });

    python.stderr.on('data', (data) => {
      const chunk = data.toString();
      console.error(`Python stderr: ${chunk}`);
      errorOutput += chunk;
    });

    python.on('close', (code) => {
      console.log(`Python script ${scriptName} exited with code ${code}`);
      
      if (code !== 0) {
        return reject(errorOutput || `Python script exited with code ${code}`);
      }

      if (output.trim().startsWith('{') || output.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(output);
          resolve(parsed);
        } catch (e) {
          console.error('Failed to parse JSON output:', e);
          resolve({ 
            rawOutput: output,
            status: 'success', 
            message: 'Output could not be parsed as JSON' 
          });
        }
      } else {
        resolve({ 
          rawOutput: output,
          status: 'success'
        });
      }
    });

    python.on('error', (err) => {
      console.error(`Error spawning Python process: ${err}`);
      reject(`Failed to start Python process: ${err.message}`);
    });
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Author API server running on http://localhost:${PORT}`);
});
