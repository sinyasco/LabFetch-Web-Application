import express from 'express';
import bcrypt  from 'bcrypt';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwt  from 'jsonwebtoken';
import cors from "cors";
import db from './config/db.js';
import os from 'os';
import path from 'path';
import { exec, spawn } from 'child_process';
import { fileURLToPath } from 'url';
// middlewares 
import userRoutes from './routes/userRoutes.js';

import checkRole from './middlewares/checkRole.js';
import fs from 'fs';
import verifyToken from './middlewares/verifyToken.js';

import nodemailer from 'nodemailer';
import multer from 'multer';

const app = express();

// Middleware pour parser JSON
app.use(express.json());

app.use(cors()); // Allow frontend to access backend

const SECRET_KEY = "mon_secret"; // Clé secrète pour signer le token (à mettre dans un fichier .env plus tard)



// Make sure temp directory exists
const tempDir = path.resolve('./temp_data');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inside your POST route
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

    const scriptPath = path.resolve(__dirname, 'mise_a_jour/dblp_scraper_one_author.py');
    if (!fs.existsSync(scriptPath)) {
      return res.status(500).json({ error: 'Script not found', details: scriptPath });
    }

    const mergedData = await runPythonScript(scriptPath, [firstname, lastname]);

    const outputPath = path.resolve(__dirname, 'AuthorsPublications/output_dblp.json');
    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({ error: 'Output JSON not found', details: outputPath });
    }

    const nodeScriptPath = path.resolve(__dirname, 'fildb_mis.js');
    if (!fs.existsSync(nodeScriptPath)) {
      return res.status(500).json({ error: 'Script not found', details: nodeScriptPath });
    }

    // ✅ Execute fildb_mis.js
    await new Promise((resolve, reject) => {
      const nodeProcess = spawn('node', [nodeScriptPath]);

      nodeProcess.stdout.on('data', (data) => {
        console.log(`fildb_mis stdout: ${data}`);
      });

      nodeProcess.stderr.on('data', (data) => {
        console.error(`fildb_mis stderr: ${data}`);
      });

      nodeProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(`fildb_mis.js exited with code ${code}`);
        }
      });
    });

    // ✅ Return success
    res.json({
      success: true,
      data: mergedData,
      message: `Publication data for ${nomComplet} has been successfully retrieved and inserted into the database.`,
    });

  } catch (error) {
    console.error('Error running scripts:', error);
    res.status(500).json({
      error: 'Processing failed',
      details: error.toString()
    });
  }
});


export function runPythonScript(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`Running Python script: ${scriptPath} with args: ${args.join(' ')}`);

    const pythonCommand = os.platform() === 'win32' ? 'python' : 'python3';

    const env = {
      ...process.env,
      PYTHONPATH: `${process.env.PYTHONPATH || ''}:${path.dirname(scriptPath)}`
    };

    const python = spawn(pythonCommand, [scriptPath, ...args], { env });

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
      console.log(`Python script ${scriptPath} exited with code ${code}`);

      if (code !== 0) {
        return reject(errorOutput || `Python script exited with code ${code}`);
      }

      // Try to extract JSON from output
      const jsonMatches = output.match(/(\{[\s\S]*?\}|\[[\s\S]*?\])/g);

      if (jsonMatches && jsonMatches.length > 0) {
        try {
          const lastJson = jsonMatches[jsonMatches.length - 1];
          const parsed = JSON.parse(lastJson);
          resolve(parsed);
        } catch (e) {
          console.error('Failed to parse JSON output:', e);
          resolve({
            rawOutput: output,
            status: 'partial_success',
            message: 'Output could not be parsed as JSON'
          });
        }
      } else {
        resolve({
          rawOutput: output,
          status: 'success',
          message: 'No JSON found in output'
        });
      }
    });

    python.on('error', (err) => {
      console.error(`Error spawning Python process: ${err}`);
      reject(`Failed to start Python process: ${err.message}`);
    });
  });
}

// Add a health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Author API server is running' });
});



// Function to run Python scripts
// Function to run Python scripts with improved encoding handling
// Function to run Python scripts with improved debugging
function runPythonScript_2(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`Running Python script: ${scriptPath} with args: ${args.join(' ')}`);

    // Use absolute paths for Python executable
    const pythonCommand = os.platform() === 'win32' ? 
      process.env.PYTHON_PATH || 'python' : 'python3';
    
    console.log(`Using Python command: ${pythonCommand}`);
    
    const timeout = 300000; // 5 minutes
    let timeoutId;

    // Enhanced environment variables for Python
    const env = {
      ...process.env,
      PYTHONUNBUFFERED: '1',  // Force Python to run unbuffered - critical for output
      PYTHONIOENCODING: 'utf-8',  // Set Python's IO encoding to UTF-8
    };

    // Construct the complete command with arguments
    const fullCommand = [scriptPath, ...args];
    console.log(`Full command: ${pythonCommand} ${fullCommand.join(' ')}`);

    // Spawn options with more details
    const spawnOptions = {
      env,
      stdio: 'pipe',  // Explicitly set stdio
      cwd: path.dirname(scriptPath),  // Set working directory to script location
      shell: true  // Use shell on all platforms for this case
    };

    console.log(`Spawn options: ${JSON.stringify({
      env: { PYTHONUNBUFFERED: env.PYTHONUNBUFFERED, PYTHONIOENCODING: env.PYTHONIOENCODING },
      cwd: spawnOptions.cwd,
      shell: spawnOptions.shell
    })}`);

    const python = spawn(pythonCommand, fullCommand, spawnOptions);

    let output = '';
    let errorOutput = '';

    // Log the process ID for debugging
    console.log(`Python process spawned with PID: ${python.pid || 'unknown'}`);

    python.stdout.on('data', (data) => {
      try {
        const chunk = data.toString('utf8');
        console.log(`Python stdout: ${chunk}`);
        output += chunk;
      } catch (err) {
        console.warn(`Error processing stdout: ${err.message}`);
      }
    });

    python.stderr.on('data', (data) => {
      try {
        const chunk = data.toString('utf8');
        console.error(`Python stderr: ${chunk}`);
        errorOutput += chunk;
      } catch (err) {
        console.warn(`Error processing stderr: ${err.message}`);
      }
    });

    python.on('close', (code) => {
      clearTimeout(timeoutId);
      console.log(`Python process closed with code ${code}`);
      
      // Check for any output files that might have been created
      const today = new Date();
      const year = today.getFullYear();
      const possibleOutputFile = path.resolve(path.dirname(scriptPath), `research_team_${year}.json`);
      
      console.log(`Checking for output file: ${possibleOutputFile}`);
      
      if (fs.existsSync(possibleOutputFile)) {
        console.log(`Found output file: ${possibleOutputFile}`);
        try {
          const fileContent = fs.readFileSync(possibleOutputFile, 'utf8');
          const data = JSON.parse(fileContent);
          console.log(`Successfully parsed output file with ${data.length} entries`);
          return resolve(data);
        } catch (err) {
          console.warn(`Error reading output file: ${err.message}`);
        }
      } else {
        console.log(`Output file not found at: ${possibleOutputFile}`);
      }
      
      if (code !== 0) {
        console.error(`Python script failed with code ${code}, error: ${errorOutput}`);
        return reject(errorOutput || `Python script exited with code ${code}`);
      }

      const jsonMatches = output.match(/(\{[\s\S]*?\}|\[[\s\S]*?\])/g);
      if (jsonMatches && jsonMatches.length > 0) {
        try {
          const lastJson = jsonMatches[jsonMatches.length - 1];
          console.log(`Found JSON in output, parsing...`);
          resolve(JSON.parse(lastJson));
        } catch (e) {
          console.warn(`JSON parsing failed: ${e.message}`);
          resolve({
            rawOutput: output,
            status: 'partial_success',
            message: 'JSON parsing failed',
          });
        }
      } else {
        console.log(`No JSON found in output, returning raw output`);
        resolve({
          rawOutput: output,
          status: 'success',
          message: 'No JSON found in output',
        });
      }
    });

    python.on('error', (err) => {
      clearTimeout(timeoutId);
      console.error(`Failed to start Python process: ${err.message}`);
      reject(`Failed to start Python: ${err.message}`);
    });

    // Add an additional event listener for debugging
    python.on('disconnect', () => {
      console.log(`Python process disconnected`);
    });

    timeoutId = setTimeout(() => {
      console.error(`Python script timed out after ${timeout}ms`);
      python.kill();
      reject('Python script timed out');
    }, timeout);
  });
}

// Alternative direct execution function as a backup
export async function runPythonScriptDirect(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`Running Python script directly: ${scriptPath} with args: ${args.join(' ')}`);
    
    const pythonCommand = os.platform() === 'win32' ? 'python' : 'python3';
    const fullCommand = [scriptPath, ...args];

    const child = spawn(pythonCommand, fullCommand, {
      cwd: path.dirname(scriptPath),
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8',
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`Python stdout: ${output.trim()}`);
    });

    child.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      stderr += errorOutput;
      console.error(`Python stderr: ${errorOutput.trim()}`);
    });

    child.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      if (code !== 0) {
        reject(new Error(`Python exited with code ${code}\nStderr: ${stderr}`));
        return;
      }

      const today = new Date();
      const year = today.getFullYear();
      const outputFile = path.resolve(path.dirname(scriptPath),`AuthorsPublications/dblp_lmcs_2025.json` );

      if (fs.existsSync(outputFile)) {
        try {
          const data = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
          resolve({
            rawOutput: stdout,
            data,
            status: 'success',
            message: 'Output file successfully processed'
          });
        } catch (err) {
          resolve({
            rawOutput: stdout,
            status: 'partial_success',
            message: `Output exists but parsing failed: ${err.message}`
          });
        }
      } else {
        resolve({
          rawOutput: stdout,
          status: 'success',
          message: 'Execution completed, but output file not found.'
        });
      }
    });

    child.on('error', (error) => {
      console.error(`Process error: ${error.message}`);
      reject(error);
    });
  });
}

// Simple function to execute a command and log output
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(`Executing command: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (stdout) console.log(`Command stdout: ${stdout}`);
      if (stderr) console.error(`Command stderr: ${stderr}`);
      
      if (error) {
        console.error(`Command error: ${error.message}`);
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

// Mise à jour endpoint with improved error handling
app.post('/api/mise-a-jour', async (req, res) => {
  const reqUser = { id: 'test-user', role: 'admin' };
  const { role } = reqUser;

  if (role !== 'admin' && role !== 'editor') {
    return res.status(403).json({ error: 'Permission denied' });
  }

  try {
    console.log('Starting update process...');

    // Step 1: Verify Python installation
    try {
      await executeCommand(os.platform() === 'win32' ? 'python --version' : 'python3 --version');
    } catch (err) {
      console.error('Failed to verify Python installation:', err);
      // Continue anyway, just log the error
    }

    // Check if the script exists
    const scriptPath = path.resolve(__dirname, './mise_a_jour/mis_dblp.py');

    if (!fs.existsSync(scriptPath)) {
      return res.status(500).json({ error: 'Python script not found', details: scriptPath });
    }
    console.log(`Script exists at: ${scriptPath}`);

    // Log script file size and permissions
    const scriptStats = fs.statSync(scriptPath);
    console.log(`Script size: ${scriptStats.size} bytes, Mode: ${scriptStats.mode.toString(8)}`);

    // Step 2: Try to run the script
    let updateResult;
    let executionError;

    try {
      // First attempt with spawn
      updateResult = await runPythonScriptDirect(scriptPath);
    } catch (pythonError) {
      console.error('First attempt failed:', pythonError);
      executionError = pythonError;
      
      try {
        // Second attempt with execFile
        console.log('Trying alternative execution method...');
        updateResult = await runPythonScriptDirect(scriptPath);
      } catch (secondError) {
        console.error('Second attempt also failed:', secondError);
        executionError = `${executionError}\n\nSecond attempt error: ${secondError}`;
      }
    }

    // Step 3: Check for JSON output even if execution failed
    const today = new Date();
    const year = today.getFullYear();
    const outputPath = path.resolve(__dirname, `./mise_a_jour/AuthorsPublications/dblp_lmcs.json`);

    console.log(`Looking for output file at: ${outputPath}`);
    
    let outputJsonData = null;

    if (fs.existsSync(outputPath)) {
      console.log(`Output file found: ${outputPath}`);
      try {
        const jsonContent = fs.readFileSync(outputPath, 'utf-8');
        outputJsonData = JSON.parse(jsonContent);
        console.log(`Successfully parsed output file with ${outputJsonData.length} entries`);
      } catch (err) {
        console.error(`Error reading JSON output: ${err.message}`);
      }
    } else {
      console.warn(`Expected output file not found: ${outputPath}`);
    }

    // Step 4: Run Node.js script only if we have JSON data
    let nodeScriptResult = { success: false, message: 'No data to process' };
    
    if (outputJsonData) {
      const nodeScriptPath = path.resolve(__dirname, './mise_a_jour/AuthorsPublications/fildb_mis_2.js');

      if (!fs.existsSync(nodeScriptPath)) {
        return res.status(500).json({ 
          error: 'Node.js script not found', 
          details: nodeScriptPath,
          pythonResult: updateResult || { error: executionError }
        });
      }

      try {
        console.log(`Running Node.js script: ${nodeScriptPath}`);
        await new Promise((resolve, reject) => {
          const nodeProcess = spawn('node', [nodeScriptPath], { 
            stdio: 'pipe',
            cwd: path.dirname(nodeScriptPath)
          });

          nodeProcess.stdout.on('data', (data) => {
            console.log(`fildb_mis stdout: ${data}`);
          });

          nodeProcess.stderr.on('data', (data) => {
            console.error(`fildb_mis stderr: ${data}`);
          });

          nodeProcess.on('close', (code) => {
            console.log(`Node.js script exited with code: ${code}`);
            if (code === 0) {
              nodeScriptResult = { success: true, message: 'Database updated successfully' };
              resolve();
            } else {
              reject(`fildb_mis.js exited with code ${code}`);
            }
          });
          
          nodeProcess.on('error', (err) => {
            console.error(`Node.js script error: ${err.message}`);
            reject(err);
          });
        });
      } catch (nodeError) {
        console.error('Node.js script error:', nodeError);
        nodeScriptResult = { success: false, message: nodeError.toString() };
      }
    }

    // Step 5: Return response with all available information
  const authorsArray = Array.isArray(outputJsonData.authors) ? outputJsonData.authors : [];

res.json({
  success: authorsArray.length > 0,
  message: authorsArray.length > 0
    ? 'Mise à jour terminée avec succès.'
    : 'Mise à jour partielle ou échouée, voir les détails',
  stats: {
    pythonExecution: updateResult || { error: executionError },
    publications: authorsArray.reduce((sum, author) => sum + (author.publications?.length || 0), 0),
    authors: authorsArray.length,
    nodeScriptResult
  },
});


  } catch (error) {
    console.error('Mise à jour failed:', error);
    res.status(500).json({
      error: 'La mise à jour a échoué',
      details: error.toString(),
    });
  }
});
// Add endpoint to check if Python dependencies are installed
app.get('/api/check-dependencies', async (req, res) => {
  try {
    const pythonCommand = os.platform() === 'win32' ? 'python' : 'python3';
    const checkScript = `
import importlib.util
required_modules = ['requests', 'scholarly']
missing = []
for module in required_modules:
    if importlib.util.find_spec(module) is None:
        missing.append(module)
print(','.join(missing) if missing else 'ok')
`;
    
    const python = spawn(pythonCommand, ['-c', checkScript]);
    let output = '';
    
    python.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    python.on('close', (code) => {
      const result = output.trim();
      if (result === 'ok') {
        res.json({ status: 'ok', message: 'All required Python dependencies are installed' });
      } else {
        const missing = result.split(',');
        res.json({ 
          status: 'warning', 
          message: 'Missing Python dependencies', 
          missing 
        });
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.toString() });
  }
});

// Add a health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Author API server is running' });
});


// Route de connexion
// Route de connexion
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    // Check user exists and get password
    const [users] = await db.promise().query(
      `SELECT *
       FROM utilisateur
       WHERE email = ?`, 
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Utilisateur non trouvé" });
    }

    const user = users[0];

    // Check account status
    if (user.statut !== 1) {
      return res.status(403).json({ 
        message: "Compte non activé. Contactez l'administrateur." 
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.mot_de_passe);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Mot de passe incorrect" });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, chercheur_id: user.chercheur_id, email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({  
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        chercheur_id: user.chercheur_id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Erreur serveur :", err);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

// 4️⃣ Routes protégées avec verifyToken
app.get('/chercheurs', verifyToken, async (req, res) => {
  try {
      const [chercheurs] = await db.promise().query("SELECT * FROM chercheur");
      res.json(chercheurs);
  } catch (error) {
      res.status(500).json({ message: "Erreur serveur" });
  }
});

//Route protégée accessible seulement aux administrateurs
app.get('/admin/dashboard', verifyToken, checkRole('admin'), (req, res) => {
  res.json({ message: "Bienvenue sur le tableau de bord Admin !" });
});

// API Route
app.get("/api/data", (req, res) => {
  db.query("SELECT chercheur_id, nom_complet, email, telephone, diplome, etablissement, qualite, grade, h_index, matricule, equipe, dblp, scholar, linkedin, researchgate, talent, image, image_mimetype FROM chercheur_lmcs", (err, results) => {
      if (err) {
          res.status(500).json({ error: err.message });
          return;
      }
      
      // Convert BLOB data to base64 strings
      const researchers = results.map(researcher => {
          if (researcher.image) {
              return {
                  ...researcher,
                  image_base64: `data:${researcher.image_mimetype};base64,${researcher.image.toString('base64')}`
              };
          }
          return researcher;
      });
      
      res.json(researchers);
  });
});
  
app.get("/api/researchers/:id", (req, res) => {
  const { id } = req.params;
  db.query(`SELECT 
    cl.chercheur_id as chercheur_id, 
    ANY_VALUE(cl.nom_complet) AS nom_complet,
    ANY_VALUE(cl.email) AS email, 
    ANY_VALUE(cl.telephone) AS telephone, 
    ANY_VALUE(cl.diplome) AS diplome, 
    ANY_VALUE(cl.etablissement) AS etablissement, 
    ANY_VALUE(cl.qualite) as qualite, 
    ANY_VALUE(cl.grade) as grade,
    ANY_VALUE(cl.h_index) as h_index, 
    ANY_VALUE(cl.matricule) as matricule, 
    ANY_VALUE(cl.equipe) as equipe,
    ANY_VALUE(cl.dblp) as dblp, 
    ANY_VALUE(cl.scholar) as scholar, 
    ANY_VALUE(cl.researchgate) as researchgate,
    ANY_VALUE(cl.talent) as talent, 
    ANY_VALUE(cl.linkedin) as linkedin, 
    ANY_VALUE(cl.image) as image,
    ANY_VALUE(cl.image_mimetype) as image_mimetype, 
    ANY_VALUE(u.statut) as statut,
    COUNT(DISTINCT p.pub_id) AS nb_pub,
    COALESCE(SUM(CASE WHEN p.Annee = YEAR(CURDATE()) THEN 1 ELSE 0 END), 0) AS nb_pub0,
    COALESCE(SUM(CASE WHEN p.Annee = YEAR(CURDATE()) - 1 THEN 1 ELSE 0 END), 0) AS nb_pub1,
    COALESCE(SUM(CASE WHEN p.Annee = YEAR(CURDATE()) - 2 THEN 1 ELSE 0 END), 0) AS nb_pub2,
    COALESCE(SUM(CASE WHEN p.Annee = YEAR(CURDATE()) - 3 THEN 1 ELSE 0 END), 0) AS nb_pub3,
    COALESCE(SUM(CASE WHEN p.Annee = YEAR(CURDATE()) - 4 THEN 1 ELSE 0 END), 0) AS nb_pub4,
    COALESCE(SUM(CASE WHEN p.Annee = YEAR(CURDATE()) - 5 THEN 1 ELSE 0 END), 0) AS nb_pub5,
    COALESCE(SUM(CASE WHEN p.Annee = YEAR(CURDATE()) - 6 THEN 1 ELSE 0 END), 0) AS nb_pub6
  FROM 
    chercheur_lmcs cl
    LEFT JOIN utilisateur u on cl.chercheur_id = u.chercheur_id
    LEFT JOIN chercheur_publication cp ON cl.chercheur_id = cp.chercheur_id
    LEFT JOIN publication p ON cp.pub_id = p.pub_id
  WHERE 
    cl.chercheur_id = ?
  GROUP BY 
    cl.chercheur_id;
  `, [id], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ error: "Researcher not found" });
      return;
    }
    
    const researcher = results[0];
    
    // If there's an image, convert the Buffer to a base64 string
    if (researcher.image) {
      researcher.image = researcher.image.toString('base64');
    }
    
    res.json(researcher);
  });
});
    
  // In your backend route for /api/researcher/:id/publications
  app.get('/api/researcher/:id/publications', (req, res) => {
    const query = `
      SELECT 
        p.pub_id, 
        p.titre, 
        p.nombre_pages, 
        p.Annee, 
        cj.nom AS conf_journal_name
      FROM publication p
      JOIN chercheur_publication cp ON p.pub_id = cp.pub_id
      LEFT JOIN conf_journal cj ON p.conf_id = cj.conf_id  -- Changed to LEFT JOIN
      WHERE cp.chercheur_id = ?`;
    
    db.query(query, [req.params.id], (err, results) => {
      if (err) return res.status(500).send(err);
      res.json(results);
    });
  });
  
  app.get("/api/co_chercheurs/:chercheur_id/:pub_id", (req, res) => {
    const { chercheur_id, pub_id } = req.params;
  
    db.query(
      "SELECT DISTINCT c.nom_complet FROM chercheur_publication cp JOIN chercheur c ON cp.chercheur_id = c.chercheur_id WHERE cp.pub_id = ? AND cp.chercheur_id <> ?",
      [pub_id, chercheur_id],
      (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Database error" });
        }
  
        // Ensure JSON format
        res.json(results.length ? results : []);
      }
    );
  });

  app.get("/api/publication/:id", (req, res) => {
    const pubId = req.params.id;
    const sql = `
     SELECT 
        p.*,
        cj.*,
        cls.*,
        CASE WHEN p.pdf_file IS NOT NULL THEN 1 ELSE 0 END as has_pdf
      FROM publication p
      LEFT JOIN conf_journal cj ON p.conf_id = cj.conf_id
      LEFT JOIN classement cls ON cj.conf_id = cls.conf_id
      WHERE p.pub_id = ?
    `;
  
    db.query(sql, [pubId], (err, result) => {
      if (err) {
        console.error("Error fetching publication:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      if (result.length === 0) {
        return res.status(404).json({ message: "Publication not found" });
      }
      
      // Don't send the actual PDF data in the general endpoint
      // In your GET /api/publication/:id endpoint
      const response = {
        ...result[0],
        // Or better yet, use proper boolean:
        has_pdf: Boolean(result[0].pdf_file)
      };
      delete response.pdf_file;
      delete response.pdf_mimetype;
      
      res.json(response);
    });
  });
  
  app.get("/api/Publications", (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
  
    db.query(
      `SELECT p.*, cj.nom 
       FROM publication p
       LEFT JOIN conf_journal cj ON p.conf_id = cj.conf_id
       ORDER BY p.pub_id DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, results) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(results);
      }
    );
  });
  
  app.get("/api/Publications/search", (req, res) => {
    const searchTerm = req.query.q;
  
    db.query(
      `SELECT p.*, cj.nom 
       FROM publication p
       LEFT JOIN conf_journal cj ON p.conf_id = cj.conf_id
       WHERE p.titre LIKE ? OR cj.nom LIKE ?
       ORDER BY p.Annee DESC`,
      [`%${searchTerm}%`, `%${searchTerm}%`],
      (err, results) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(results);
      }
    );
  });
  
  app.get("/api/Publications/count", (req, res) => {
    db.query(
      `SELECT COUNT(*) AS count FROM publication`,
      (err, results) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(results[0]);
      }
    );
  });
  
  app.get("/api/Last-Publications", (req, res) => {
    db.query(`SELECT p.*, cj.nom 
  FROM publication p 
  LEFT JOIN conf_journal cj ON p.conf_id = cj.conf_id 
  WHERE p.Annee = YEAR(CURDATE()) 
  ORDER BY p.pub_id DESC
  LIMIT 10`, (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results);
    });
  });
  
  app.get("/api/Authors/:id", (req, res) => {
    const { id } = req.params;
    db.query(`SELECT c.nom_complet, c.chercheur_id, c.intern
              FROM chercheur_publication cp
              JOIN chercheur c ON cp.chercheur_id = c.chercheur_id
              WHERE cp.pub_id = ?`, [id], (err, results) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(results);
      });
  });
  
  app.get("/api/:chercheur_id/collaborations", (req, res) => {
    const { chercheur_id } = req.params;
  
    // Ensure chercheur_id is a valid number
    if (isNaN(chercheur_id)) {
      res.status(400).json({ error: "Invalid researcher ID" });
      return;
    }
  
    const query = `
      SELECT DISTINCT c.chercheur_id, c.nom_complet, c.intern 
      FROM chercheur_publication cp1 
      JOIN chercheur_publication cp2 ON cp1.pub_id = cp2.pub_id 
      JOIN chercheur c ON cp2.chercheur_id = c.chercheur_id 
      WHERE cp1.chercheur_id = ? AND cp2.chercheur_id <> ?;
    `;
  
    // Pass chercheur_id twice as parameters
    db.query(query, [chercheur_id, chercheur_id], (err, results) => {
      if (err) {
        console.error("SQL Error:", err);
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(results);
    });
  });
  
  app.get("/api/Stats", (req, res) => {
    db.query(
      `SELECT 
      (SELECT COUNT(*) FROM publication) AS nb_pub,  -- Total publications
      (SELECT COUNT(*) FROM publication WHERE Annee = YEAR(CURDATE())) AS nb_pub_cet_annee,  -- Publications this year
      (SELECT COUNT(*) FROM chercheur_lmcs) AS nb_chercheurs,  -- Total researchers
      (select count(*) from chercheur where intern = 0) as nb_collabs,
      (select round(avg(h_index),2) from chercheur_lmcs) as avg_h_index
  `,
      (err, results) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json(results[0]);
      }
    );
  });
  
  app.get("/api/Chart", (req, res) => {
    const sql = `
      SELECT
        COALESCE(SUM(CASE WHEN Annee = YEAR(CURDATE()) THEN 1 ELSE 0 END), 0) AS nb_pub0,
        COALESCE(SUM(CASE WHEN Annee = YEAR(CURDATE()) - 1 THEN 1 ELSE 0 END), 0) AS nb_pub1,
        COALESCE(SUM(CASE WHEN Annee = YEAR(CURDATE()) - 2 THEN 1 ELSE 0 END), 0) AS nb_pub2,
        COALESCE(SUM(CASE WHEN Annee = YEAR(CURDATE()) - 3 THEN 1 ELSE 0 END), 0) AS nb_pub3,
        COALESCE(SUM(CASE WHEN Annee = YEAR(CURDATE()) - 4 THEN 1 ELSE 0 END), 0) AS nb_pub4,
        COALESCE(SUM(CASE WHEN Annee = YEAR(CURDATE()) - 5 THEN 1 ELSE 0 END), 0) AS nb_pub5,
        COALESCE(SUM(CASE WHEN Annee = YEAR(CURDATE()) - 6 THEN 1 ELSE 0 END), 0) AS nb_pub6,
        COALESCE(SUM(CASE WHEN Annee = YEAR(CURDATE()) - 7 THEN 1 ELSE 0 END), 0) AS nb_pub7,
        COALESCE(SUM(CASE WHEN Annee = YEAR(CURDATE()) - 8 THEN 1 ELSE 0 END), 0) AS nb_pub8,
        COALESCE(SUM(CASE WHEN Annee = YEAR(CURDATE()) - 9 THEN 1 ELSE 0 END), 0) AS nb_pub9,
        COALESCE(SUM(CASE WHEN Annee = YEAR(CURDATE()) - 10 THEN 1 ELSE 0 END), 0) AS nb_pub10,
        COALESCE(SUM(CASE WHEN Annee = YEAR(CURDATE()) - 11 THEN 1 ELSE 0 END), 0) AS nb_pub11,
        COALESCE(SUM(CASE WHEN Annee = YEAR(CURDATE()) - 12 THEN 1 ELSE 0 END), 0) AS nb_pub12,
        COALESCE(SUM(CASE WHEN Annee = YEAR(CURDATE()) - 13 THEN 1 ELSE 0 END), 0) AS nb_pub13
      FROM publication;
    `;
  
     db.query(sql, (err, results) => {
      if (err) {
        console.error("Error fetching stats:", err);
        res.status(500).json({ error: "Database query failed" });
      } else {
        res.json(results[0]); // Send the first row of the result
      }
    });
  });

// Route to add chercheur (just name)
app.post('/api/add-chercheur', async (req, res) => {
  try {
    const { nom_complet } = req.body;

    if (!nom_complet) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    // 1. Check if chercheur already exists
    const [existing] = await db.promise().query(
      'SELECT chercheur_id FROM chercheur WHERE nom_complet = ?',
      [nom_complet]
    );

    if (existing.length > 0) {
      return res.status(409).json({ 
        error: 'Chercheur already exists', 
        chercheur_id: existing[0].chercheur_id 
      });
    }

    // 2. If not exists, insert
    const [result] = await db.promise().query(
      'INSERT INTO chercheur (nom_complet, intern) VALUES (?, 1)',
      [nom_complet]
    );

    res.status(201).json({ chercheur_id: result.insertId });

  } catch (error) {
    console.error('Error adding chercheur:', error);
    res.status(500).json({ error: 'Failed to add chercheur' });
  }
});

// Route to add chercheur details to chercheur_lmcs
app.post('/api/add-chercheur-lmcs', async (req, res) => {
  try {
    const {
      chercheur_id,
      nom_complet,
      email,
      telephone,
      etablissement,
      qualite,
      grade,
      h_index,
      matricule,
      equipe,
      dblp,
      scholar,
      linkedin,
      researchgate
    } = req.body;

    await db.promise().query(
      `INSERT INTO chercheur_lmcs (
        chercheur_id, nom_complet, email, telephone, etablissement,
        qualite, grade, h_index, matricule, equipe, dblp, scholar, linkedin, 
        researchgate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chercheur_id, nom_complet, email, telephone, etablissement,
        qualite, grade, h_index, matricule, equipe, dblp, scholar,
        linkedin, researchgate
      ]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding chercheur details:', error);
    res.status(500).json({ error: 'Failed to add chercheur details' });
  }
});

// Route to add user account
app.post('/api/add-utilisateur', async (req, res) => {
  try {
    const { chercheur_id, nom, email } = req.body;

    const hashedPassword = await bcrypt.hash('123456', 10);
    
    await db.promise().query(
      'INSERT INTO utilisateur (chercheur_id, nom, email, mot_de_passe, role, statut, changed) VALUES (?, ?, ?, ?, "chercheur", 0, 0)',
      [chercheur_id, nom, email, hashedPassword]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding utilisateur:', error);
    res.status(500).json({ error: 'Failed to add user account' });
  }
});

// Get pending researchers
app.get('/api/pending-researchers', async (req, res) => {
  try {
      const [results] = await db.promise().query(
          `SELECT c.chercheur_id, c.nom_complet, c.email, c.matricule, c.telephone
       FROM chercheur_lmcs c left join utilisateur u on c.chercheur_id = u.chercheur_id
       WHERE u.statut = 0`
      );
      res.json(results);
  } catch (error) {
      console.error('Error fetching researchers:', error);
      res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/activate-researcher', async (req, res) => {
  try {
    const { chercheur_id, password, to, from } = req.body;

    // Validate input
    if (!chercheur_id || !password || !to || !from) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.promise().beginTransaction();

    try {
      // Check if researcher exists
      const [researcher] = await db.promise().query(
        `SELECT chercheur_id, nom_complet FROM chercheur_lmcs WHERE chercheur_id = ?`,
        [chercheur_id]
      );

      if (researcher.length === 0) {
        throw new Error('Researcher not found');
      }

      const nom_complet = researcher[0].nom_complet;

      // Update password
      const [pwdResult] = await db.promise().query(
        `UPDATE utilisateur SET mot_de_passe = ? WHERE chercheur_id = ?`,
        [hashedPassword, chercheur_id]
      );

      if (pwdResult.affectedRows === 0) {
        throw new Error('No user account found for this researcher');
      }

      // Update status
      await db.promise().query(
        `UPDATE utilisateur SET statut = 1 WHERE chercheur_id = ?`,
        [chercheur_id]
      );

      // Send email with password using Brevo (formerly Sendinblue)
      const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false, // false for 587, true for 465
        auth: {
          user: '8c089e001@smtp-brevo.com', // Your Brevo account email
          pass: 's49v52QE3LjnPUda' // Your Brevo SMTP password (API key)
        }
      });

      const mailOptions = {
        from: "LabFetch <labfetch.lmcs@gmail.com>",
        to,
        subject: `Activation du compte chercheur - ${nom_complet}`,
        html: `
        <p><strong>*Cela est juste un test*</strong></p>
          <p>Bonjour Mr./Mme. ${nom_complet},</p>
          <p>Votre compte a été activé avec succès.</p>
          <p><strong>Voici votre mot de passe :</strong> ${password}</p>
          <p>Veuillez le changer après connexion.</p>
          <p>Cordialement,<br>LabFetch, une application de LMCS</p>
          <br>
          <img src="https://i.postimg.cc/gJ7hQhw4/LabFetch.png" alt="LabFetch Logo" style="width:150px;">
        `
      };      

      await transporter.sendMail(mailOptions);

      await db.promise().commit();

      res.json({
        success: true,
        message: 'Researcher activated and email sent successfully'
      });
    } catch (error) {
      await db.promise().rollback();
      throw error;
    }

  } catch (error) {
    console.error('Activation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to activate researcher'
    });
  }
});

// API endpoint to fetch roles and dates
app.get("/api/mises-a-jour", (req, res) => {
  // Query to get the roles and the dates
  const query = `
  SELECT role, timestamp
  FROM maj
  ORDER BY timestamp DESC;
  `;
  db.query(query, (err, results) => {
      if (err) throw err;
      res.json(results);
  });
});

// Backend API (add this new route)
app.get("/api/researchers/:id/profile-image", (req, res) => {
  const { id } = req.params;
  
  // First verify the user exists
  db.query(`SELECT id, chercheur_id FROM utilisateur WHERE id = ?`, [id], 
    (err, userResults) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      
      if (userResults.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const chercheurId = userResults[0].chercheur_id;
      
      // Get researcher image data (BLOB)
      db.query(
        `SELECT image, image_mimetype 
         FROM chercheur_lmcs 
         WHERE chercheur_id = ?`, 
        [chercheurId],
        (err, researcherResults) => {
          if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Internal server error" });
          }
          
          if (researcherResults.length === 0) {
            return res.status(404).json({ 
              error: "Researcher profile not found",
              details: `No matching chercheur_lmcs record for chercheur_id ${chercheurId}`
            });
          }
          
          const researcher = researcherResults[0];
          
          if (!researcher.image) {
            return res.status(404).json({ 
              error: "Profile image not found",
              details: "No image BLOB data stored for this researcher"
            });
          }
          
          // Set proper content type and send the image BLOB
          res.set('Content-Type', researcher.image_mimetype || 'image/jpeg');
          res.send(researcher.image);
        }
      );
    }
  );
});

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB for images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed (JPEG, PNG, etc.)'), false);
    }
  }
});

// UPDATE researcher data with image upload support
app.put('/api/researchers/:chercheur_id', imageUpload.single('image'), (req, res) => {
  const { chercheur_id } = req.params;
  const updateData = req.body;

  const allowedFields = [
    'nom_complet', 'email', 'telephone', 'diplome', 'etablissement', 
    'qualite', 'grade', 'h_index', 'matricule', 'equipe', 
    'dblp', 'scholar', 'linkedin', 'researchgate', 'talent'
  ];

  // Create a filtered object and convert empty strings to NULL
  const filteredData = {};
  for (const key in updateData) {
    if (allowedFields.includes(key)) {
      // Convert empty strings or string "null" to actual NULL
      filteredData[key] = (updateData[key] === '' || updateData[key] === 'null') 
        ? null 
        : updateData[key];
    }
  }

  // Add image data if uploaded
  if (req.file) {
    filteredData.image = req.file.buffer;
    filteredData.image_mimetype = req.file.mimetype;
  } else if (updateData.removeImage === 'true') {
    // Handle explicit image removal
    filteredData.image = null;
    filteredData.image_mimetype = null;
  }

  console.log(`Attempting to update researcher ${chercheur_id}`);

  // Start a transaction
  db.beginTransaction(err => {
    if (err) {
      console.error('Error starting transaction:', err);
      return res.status(500).json({ error: "Failed to start transaction" });
    }

    // 1. Update the chercheur_lmcs table (now includes image fields)
    db.query(
      `UPDATE chercheur_lmcs SET ? WHERE chercheur_id = ?`,
      [filteredData, chercheur_id],
      (err, result) => {
        if (err) {
          console.error('Error updating researcher in chercheur_lmcs:', err);
          return db.rollback(() => {
            res.status(500).json({ error: "Failed to update researcher" });
          });
        }

        // 2. Update the chercheur table (nom column)
        const nomComplet = filteredData.nom_complet || null;
        db.query(
          `UPDATE chercheur SET nom_complet = ? WHERE chercheur_id = ?`,
          [nomComplet, chercheur_id],
          (err, result) => {
            if (err) {
              console.error('Error updating nom_complet in chercheur:', err);
              return db.rollback(() => {
                res.status(500).json({ error: "Failed to update nom_complet in chercheur" });
              });
            }

            // 3. Update the utilisateur table (nom and email)
            const utilisateurEmail = (filteredData.email === '' || filteredData.email === 'null') 
              ? null 
              : filteredData.email;
            
            db.query(
              `UPDATE utilisateur SET nom = ?, email = ? WHERE chercheur_id = ?`,
              [nomComplet, utilisateurEmail, chercheur_id],
              (err, result) => {
                if (err) {
                  console.error('Error updating utilisateur:', err);
                  return db.rollback(() => {
                    res.status(500).json({ error: "Failed to update utilisateur" });
                  });
                }

                // Commit the transaction
                db.commit(err => {
                  if (err) {
                    console.error('Error committing transaction:', err);
                    return db.rollback(() => {
                      res.status(500).json({ error: "Failed to commit transaction" });
                    });
                  }
                  res.json({ success: true, message: "Profile updated successfully" });
                });
              }
            );
          }
        );
      }
    );
  });
});

app.post('/api/mise-a-jour', async (req, res) => {
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({ message: "Role is required" });
  }

  try {
    // Use db.promise().query instead of db.execute
    const [result] = await db.promise().query("INSERT INTO maj (role) VALUES (?)", [role]);

    if (result.affectedRows > 0) {
      return res.status(200).json({ message: "Successfully inserted" });
    } else {
      return res.status(500).json({ message: "Failed to insert" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error inserting into database" });
  }
});


app.put('/api/change-password/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { old_password, new_password, confirm_password } = req.body;

    if (!old_password || !new_password || !confirm_password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    if (new_password !== confirm_password) {
      return res.status(400).json({ error: 'New password and confirm password do not match' });
    }

    const [rows] = await db.promise().query(
      `SELECT mot_de_passe FROM utilisateur WHERE id = ?`,
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const storedPassword = rows[0].mot_de_passe;

    const isMatch = await bcrypt.compare(old_password, storedPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const hashedNewPassword = await bcrypt.hash(new_password, 10);

    await db.promise().query(
      `UPDATE utilisateur SET mot_de_passe = ?, changed = 1 WHERE id = ?`,
      [hashedNewPassword, user_id]
    );

    res.json({ success: true, message: 'Password updated successfully' });

  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: error.message || 'Failed to update password' });
  }
});

// DELETE /api/publications/:pub_id
app.delete('/api/publications/:pub_id', (req, res) => {
  const { pub_id } = req.params;

  const sql = 'DELETE FROM publication WHERE pub_id = ?';

  db.query(sql, [pub_id], (err, result) => {
    if (err) {
      console.error('Error deleting publication:', err);
      return res.status(500).json({ message: 'Server error while deleting publication' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Publication not found' });
    }

    res.status(200).json({ message: 'Publication deleted successfully' });
  });
});

// API route: Check if a chercheur is an author of a publication
app.get('/is-Author', (req, res) => {
  const { chercheur_id, pub_id } = req.query;

  if (!chercheur_id || !pub_id) {
    return res.status(400).json({ message: 'Missing chercheur_id or pub_id' });
  }

  const query = `
    SELECT 1 FROM chercheur_publication 
    WHERE chercheur_id = ? AND pub_id = ? 
    LIMIT 1
  `;

  db.query(query, [chercheur_id, pub_id], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    return res.json({ exists: results.length > 0 });
  });
});

app.get("/api/chercheurs_lmcs", (req, res) => {
  db.query(`
    SELECT 
      chercheur_id as id,
      nom_complet
    FROM chercheur_lmcs
    ORDER BY nom_complet
  `, (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});

// edit pub api
app.put('/api/publication/:id', (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  db.beginTransaction(err => {
    if (err) {
      console.error('Transaction error:', err);
      return res.status(500).json({ error: "Transaction failed to start" });
    }

    // 1. Update publication
    db.query(
      `UPDATE publication SET 
       titre=?, Annee=?, volume=?, nombre_pages=?, lien=? 
       WHERE pub_id=?`,
      [
        updateData.titre,
        updateData.Annee,
        updateData.volume,
        updateData.nombre_pages,
        updateData.lien,
        id
      ],
      (updateErr) => {
        if (updateErr) {
          return db.rollback(() => {
            res.status(500).json({ error: "Publication update failed" });
          });
        }

        // 2. Get conf_id
        db.query(
          `SELECT conf_id FROM publication WHERE pub_id=?`,
          [id],
          (selectErr, [pubResult]) => {
            if (selectErr || !pubResult) {
              return db.rollback(() => {
                res.status(500).json({ error: "Conference not found" });
              });
            }

            // 3. Update conf_journal
            db.query(
              `UPDATE conf_journal SET 
               nom=?, thematique=?, lieu=?, scope=?,
               type=?, periode=?, periodicite=?
               WHERE conf_id=?`,
              [
                updateData.nom,
                updateData.thematique || null,
                updateData.lieu,
                updateData.scope,
                updateData.type,
                updateData.periode,
                updateData.periodicite,
                pubResult.conf_id
              ],
              (confErr) => {
                if (confErr) {
                  return db.rollback(() => {
                    res.status(500).json({ error: "Conference update failed" });
                  });
                }

                // Commit and return success
                db.commit(commitErr => {
                  if (commitErr) {
                    return db.rollback(() => {
                      res.status(500).json({ error: "Commit failed" });
                    });
                  }

                  // Fetch updated data
                  db.query(
                    `SELECT p.*, c.* FROM publication p
                     LEFT JOIN conf_journal c ON p.conf_id = c.conf_id
                     WHERE p.pub_id=?`,
                    [id],
                    (finalErr, [finalResult]) => {
                      if (finalErr) {
                        console.error('Final fetch error:', finalErr);
                        return res.status(500).json({ error: "Data retrieval failed" });
                      }
                      
                      res.status(200).json({
                        success: true,
                        publication: finalResult
                      });
                    }
                  );
                });
              }
            );
          }
        );
      }
    );
  });
});

app.put('/api/publication/:pub_id/authors', async (req, res) => {
  const { pub_id } = req.params;
  const { removedAuthors = [], replacedAuthors = [] } = req.body;

  try {
    // Start transaction
    await db.promiseQuery('START TRANSACTION');

    // 1. Process author removals
    if (removedAuthors.length > 0) {
      await db.promiseQuery(
        `DELETE FROM chercheur_publication 
         WHERE pub_id = ? AND chercheur_id IN (?)`,
        [pub_id, removedAuthors]
      );
    }

    // 2. Process author replacements
    for (const { oldAuthorId, newAuthorId } of replacedAuthors) {
      // Remove old author
      await db.promiseQuery(
        `DELETE FROM chercheur_publication 
         WHERE pub_id = ? AND chercheur_id = ?`,
        [pub_id, oldAuthorId]
      );

      // Add new author (ignore if duplicate)
      await db.promiseQuery(
        `INSERT IGNORE INTO chercheur_publication (chercheur_id, pub_id)
         VALUES (?, ?)`,
        [newAuthorId, pub_id]
      );
    }

    // Commit transaction
    await db.promiseQuery('COMMIT');
    res.json({ success: true });

  } catch (error) {
    // Rollback on error
    await db.promiseQuery('ROLLBACK');
    console.error('Author update failed:', error);
    res.status(500).json({ 
      error: 'Failed to update authors',
      details: error.message 
    });
  }
});

app.put('/api/publication/:id/classements', (req, res) => {
  const pubId = req.params.id;
  const { Scimago, CORE, DGRSDT, Qualis } = req.body;

  // First get the conf_id for this publication
  const getConfIdQuery = 'SELECT conf_id FROM publication WHERE pub_id = ?';
  
  db.query(getConfIdQuery, [pubId], (err, result) => {
    if (err) {
      console.error("Error fetching conference ID:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    
    if (result.length === 0) {
      return res.status(404).json({ message: "Publication not found" });
    }

    const confId = result[0].conf_id;
    
    // Check if classement record already exists
    const checkQuery = 'SELECT * FROM classement WHERE conf_id = ?';
    
    db.query(checkQuery, [confId], (err, classementResult) => {
      if (err) {
        console.error("Error checking classement:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      // Prepare the update data
      const updateData = {
        Scimago: Scimago ? JSON.stringify(Scimago) : null,
        CORE: CORE ? JSON.stringify(CORE) : null,
        DGRSDT: DGRSDT ? JSON.stringify(DGRSDT) : null,
        Qualis: Qualis ? JSON.stringify(Qualis) : null
      };

      if (classementResult.length > 0) {
        // Update existing classement
        const updateQuery = `
          UPDATE classement 
          SET Scimago = ?, CORE = ?, DGRSDT = ?, Qualis = ?
          WHERE conf_id = ?
        `;
        
        db.query(updateQuery, [
          updateData.Scimago,
          updateData.CORE,
          updateData.DGRSDT,
          updateData.Qualis,
          confId
        ], (err, updateResult) => {
          if (err) {
            console.error("Error updating classement:", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }
          res.json({ message: "Classements updated successfully" });
        });
      } else {
        // Insert new classement
        const insertQuery = `
          INSERT INTO classement 
          (conf_id, Scimago, CORE, DGRSDT, Qualis) 
          VALUES (?, ?, ?, ?, ?)
        `;
        
        db.query(insertQuery, [
          confId,
          updateData.Scimago,
          updateData.CORE,
          updateData.DGRSDT,
          updateData.Qualis
        ], (err, insertResult) => {
          if (err) {
            console.error("Error creating classement:", err);
            return res.status(500).json({ error: "Internal Server Error" });
          }
          res.json({ message: "Classements created successfully" });
        });
      }
    });
  });
});

app.post('/api/publication/add-author', (req, res) => {
  const { chercheur_id, pub_id } = req.body;
  
  const sql = 'INSERT INTO chercheur_publication (chercheur_id, pub_id) VALUES (?, ?)';
  
  db.query(sql, [chercheur_id, pub_id], (err, result) => {
    if (err) {
      console.error("Error adding author:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    res.json({ success: true });
  });
});

// Configure multer for in-memory storage
const pdf_upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files allowed'), false);
    }
  }
});

// PDF Upload Endpoint
app.post('/api/publication/:id/upload-pdf', pdf_upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { originalname, mimetype, buffer } = req.file;
  const pubId = req.params.id;

  const sql = `
    UPDATE publication 
    SET pdf_file = ?, pdf_filename = ?, pdf_mimetype = ?
    WHERE pub_id = ?
  `;

  db.query(sql, [buffer, originalname, mimetype, pubId], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Failed to save PDF" });
    }
    res.json({ success: true });
  });
});

// PDF Download Endpoint
app.get('/api/publication/:id/pdf', (req, res) => {
  const sql = 'SELECT pdf_file, pdf_mimetype FROM publication WHERE pub_id = ?';
  
  db.query(sql, [req.params.id], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Failed to fetch PDF" });
    }

    if (!results[0]?.pdf_file) {
      return res.status(404).json({ error: "PDF not found" });
    }

    res.set('Content-Type', results[0].pdf_mimetype);
    res.send(results[0].pdf_file);
  });
});

// Add this to your existing backend routes
app.get("/api/:user_id/status", (req, res) => {
  const { user_id } = req.params; // Destructure the user_id from params

  db.query(
    "SELECT changed FROM Utilisateur WHERE id = ?",
    [user_id], // Use the user_id from the URL
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ changed: results[0].changed });
    }
  );
});

app.put('/api/deactivate-researcher', async (req, res) => {
  const { chercheur_id } = req.body;

  if (!chercheur_id) {
    return res.status(400).json({ error: 'Missing chercheur_id' });
  }

  const sql = 'UPDATE utilisateur SET statut = 0, changed = 0 WHERE chercheur_id = ?';

  try {
    const [result] = await db.promise().execute(sql, [chercheur_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Researcher not found' });
    }

    res.json({ success: true, message: 'Researcher deactivated successfully' });
  } catch (error) {
    console.error('Error during deactivation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get("/api/General-Stats", (req, res) => {
  const statsQuery = `
    SELECT 
      (SELECT COUNT(*) FROM publication) AS nb_pub,
      (SELECT COUNT(*) FROM publication WHERE Annee = YEAR(CURDATE())) AS nb_pub_cet_annee,
      (SELECT COUNT(*) FROM chercheur_lmcs) AS nb_chercheurs,
      (SELECT COUNT(*) FROM chercheur WHERE intern = 0) AS nb_collabs,
      (SELECT ROUND(AVG(h_index), 2) FROM chercheur_lmcs) AS avg_h_index,
      (SELECT COUNT(*) FROM utilisateur WHERE statut = 1 AND role = 'chercheur') AS chercheurs_actifs,
      (SELECT COUNT(*) FROM utilisateur WHERE statut = 0 AND role = 'chercheur') AS chercheurs_non_actifs,
      (SELECT COUNT(*) FROM conf_journal WHERE LOWER(type) LIKE '%conf%') AS conference,
      (SELECT COUNT(*) FROM conf_journal WHERE LOWER(type) LIKE '%journal%') AS journal,
      (SELECT COUNT(*) FROM conf_journal) AS total_conf,
      (SELECT COUNT(*) FROM chercheur_lmcs WHERE qualite = 'Enseignant-Chercheur') AS ens_chercheur,
      (SELECT COUNT(*) FROM chercheur_lmcs WHERE qualite = 'Chercheur') AS chercheur,
      (SELECT COUNT(*) FROM chercheur_lmcs WHERE qualite = 'Doctorant') AS doctorant,
      (SELECT ROUND(AVG(h_index), 2) FROM chercheur_lmcs WHERE LOWER(equipe) LIKE '%codesign%') AS h_codesign,
      (SELECT ROUND(AVG(h_index), 2) FROM chercheur_lmcs WHERE LOWER(equipe) LIKE '%eiah%') AS h_EIAH,
      (SELECT ROUND(AVG(h_index), 2) FROM chercheur_lmcs WHERE LOWER(equipe) LIKE '%image%') AS h_Image,
      (SELECT ROUND(AVG(h_index), 2) FROM chercheur_lmcs WHERE LOWER(equipe) LIKE '%msi%') AS h_MSI,
      (SELECT ROUND(AVG(h_index), 2) FROM chercheur_lmcs WHERE LOWER(equipe) LIKE '%opt%') AS h_OPT,
      (SELECT ROUND(AVG(h_index), 2) FROM chercheur_lmcs WHERE LOWER(equipe) LIKE '%sures%') AS h_SURES
  `;

  const topResearchersQuery = `
    SELECT 
      c.chercheur_id, 
      c.nom_complet, 
      c.h_index, 
      (SELECT COUNT(*) FROM chercheur_publication cp WHERE cp.chercheur_id = c.chercheur_id) AS nb_pubs
    FROM chercheur_lmcs c
    ORDER BY c.h_index DESC
    LIMIT 5;
  `;

  db.query(statsQuery, (err, statsResults) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    db.query(topResearchersQuery, (err, topResearchersResults) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.json({
        ...statsResults[0],
        top_chercheurs: topResearchersResults
      });
    });
  });
});

app.post('/api/researchers/stats', async (req, res) => {
  const { criteria } = req.body;

  if (!criteria || !Array.isArray(criteria)) {
    return res.status(400).json({ 
      success: false,
      message: "Criteria array is required" 
    });
  }

  try {
    let query = `SELECT COUNT(*) as total, 
                SUM(CASE WHEN `;
    const values = [];
    const whereClauses = [];

    // Base FROM clause with necessary joins
    let fromClause = `FROM chercheur_lmcs
                     JOIN chercheur ON chercheur_lmcs.chercheur_id = chercheur.chercheur_id
                     LEFT JOIN utilisateur ON chercheur.chercheur_id = utilisateur.chercheur_id`;

    for (const crit of criteria) {
      if (!crit.description || crit.value === undefined) {
        return res.status(400).json({ 
          success: false,
          message: "Each criterion must have description and value" 
        });
      }

      switch (crit.description) {
        case "H-index supérieur à":
          whereClauses.push("chercheur_lmcs.h_index > ?");
          values.push(Number(crit.value));
          break;
        case "Nombre de publications":
          whereClauses.push(`(
            SELECT COUNT(*) FROM chercheur_publication cp WHERE cp.chercheur_id = chercheur.chercheur_id
          ) >= ?`);
          values.push(Number(crit.value));
          break;
        case "Établissement d'origine":
          whereClauses.push("chercheur_lmcs.etablissement LIKE ?");
          values.push(`%${crit.value}%`);
          break;
        case "Statut":
          whereClauses.push("utilisateur.statut = ?");
          values.push(crit.value === "actif" ? 1 : 0);
          break;
        case "Qualité":
          whereClauses.push("chercheur_lmcs.qualite = ?");
          values.push(crit.value);
          break;
        case "Équipe":
          whereClauses.push("chercheur_lmcs.equipe like ?");
          values.push(`%${crit.value}%`);
          break;
        default:
          return res.status(400).json({ 
            success: false,
            message: `Invalid criterion: ${crit.description}` 
          });
      }
    }

    const where = whereClauses.length ? whereClauses.join(" AND ") : "1";
    query += `${where} THEN 1 ELSE 0 END) as matching ${fromClause}`;

    const [rows] = await db.promise().query(query, values);
    
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error("Researcher stats error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching researcher statistics",
      error: error.message 
    });
  }
});

// Publication Stats Endpoint
app.post('/api/publications/stats', async (req, res) => {
  const { criteria } = req.body;

  if (!criteria || !Array.isArray(criteria)) {
    return res.status(400).json({ 
      success: false,
      message: "Criteria array is required" 
    });
  }

  try {
    let query = `SELECT 
                (SELECT COUNT(*) FROM publication) as total, 
                COUNT(DISTINCT p.pub_id) as matching `;
    const values = [];
    const whereClauses = [];

    // Base query with joins
    let fromClause = `FROM publication p
                     LEFT JOIN conf_journal c ON p.conf_id = c.conf_id
                     LEFT JOIN classement cl ON c.conf_id = cl.conf_id`;

    for (const crit of criteria) {
      if (!crit.description || crit.value === undefined) {
        return res.status(400).json({ 
          success: false,
          message: "Each criterion must have description and value" 
        });
      }

      switch (crit.description) {
        case "Type de publication":
          whereClauses.push("c.type LIKE ?");
          values.push(`%${crit.value}%`);
          break;
        case "Année de publication":
          whereClauses.push("p.Annee = ?");
          values.push(Number(crit.value));
          break;
        case "Thématique":
          whereClauses.push("c.thematique LIKE ?");
          values.push(`%${crit.value}%`);
          break;
        case "Classement QUALIS":
          whereClauses.push("JSON_EXTRACT(cl.Qualis, '$.quartile') = ?");
          values.push(crit.value);
          break;
        case "Classement Scimago":
          whereClauses.push("JSON_EXTRACT(cl.Scimago, '$.quartile') = ?");
          values.push(crit.value);
          break;
        case "Classement CORE":
          whereClauses.push("JSON_EXTRACT(cl.CORE, '$.quartile') = ?");
          values.push(crit.value);
          break;
        case "Classement DGRSDT":
          whereClauses.push("JSON_EXTRACT(cl.DGRSDT, '$.quartile') = ?");
          values.push(crit.value);
          break;
        case "Période":
          whereClauses.push("c.periode like ?");
          values.push(`%${crit.value}%`);
          break;
        case "Périodicité":
          whereClauses.push("c.periodicite = ?");
          values.push(crit.value);
          break;
        case "Nombre de pages supérieur à":
          whereClauses.push("CAST(p.nombre_pages AS UNSIGNED) > ?");
          values.push(Number(crit.value));
          break;
        default:
          return res.status(400).json({ 
            success: false,
            message: `Invalid criterion: ${crit.description}` 
          });
      }
    }

    // Combine the full query
    if (whereClauses.length > 0) {
      query += `${fromClause} WHERE ${whereClauses.join(" AND ")}`;
    } else {
      query += `${fromClause}`;
    }

    const [rows] = await db.promise().query(query, values);
    
    res.json({
      success: true,
      data: {
        total: rows[0].total,
        matching: rows[0].matching
      }
    });
  } catch (error) {
    console.error("Publication stats error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching publication statistics",
      error: error.message 
    });
  }
});

// Filter publications endpoint
app.get("/api/Publications/filter", (req, res) => {
  // Parse and normalize the Type parameter
  let Type = [];
  if (req.query.Type) {
    try {
      Type = Array.isArray(req.query.Type) 
        ? req.query.Type 
        : typeof req.query.Type === 'string' && req.query.Type.startsWith('[')
          ? JSON.parse(req.query.Type)
          : [req.query.Type];
    } catch (e) {
      console.error("Error parsing Type parameter:", e);
      Type = [];
    }
  }

  // Parse classification parameters
  const parseClassification = (param) => {
    if (!param) return [];
    return Array.isArray(param) ? param : [param];
  };

  const Scimago = parseClassification(req.query.Scimago);
  const Qualis = parseClassification(req.query.Qualis);
  const CORE = parseClassification(req.query.CORE);
  const DGRSDT = parseClassification(req.query.DGRSDT);

  // Parse other parameters
  const {
    Pagemin,
    Pagemax,
    Volummin,
    Volummax,
    DateMin,
    DateMax,
    Periodemin,
    Periodemax,
    Periodicite,
    Nomsrc,
    Car,
    Ordre
  } = req.query;

  // Base query
  let query = `
    SELECT DISTINCT 
      p.pub_id, p.titre, p.Annee, p.volume, p.nombre_pages, p.lien,
      cj.conf_id, cj.nom, cj.type, cj.periodicite, cj.periode,
      cl.Scimago, cl.Qualis, cl.CORE, cl.DGRSDT
    FROM publication p
    LEFT JOIN conf_journal cj ON p.conf_id = cj.conf_id
    LEFT JOIN classement cl ON p.conf_id = cl.conf_id
    WHERE 1=1
  `;

  const params = [];

  // Type filter
  if (Type.length > 0) {
    query += ` AND (`;
    const typeConditions = [];
    
    Type.forEach(t => {
      if (t === "conf") {
        typeConditions.push(`(LOWER(cj.type) LIKE ?)`);
        params.push('%conf%');
      } else if (t === "journal") {
        typeConditions.push(`(LOWER(cj.type) LIKE ?)`);
        params.push('%journal%');
      }
    });
    
    query += typeConditions.join(' OR ');
    query += `)`;
  }

  // Classification filters
  const addClassificationFilter = (field, values) => {
    if (values.length > 0) {
      query += ` AND (`;
      const conditions = [];
      
      values.forEach(val => {
        conditions.push(`JSON_SEARCH(${field}, 'one', ?) IS NOT NULL`);
        params.push(val);
      });
      
      query += conditions.join(' OR ');
      query += `)`;
    }
  };

  addClassificationFilter('cl.Scimago', Scimago);
  addClassificationFilter('cl.Qualis', Qualis);
  addClassificationFilter('cl.CORE', CORE);
  addClassificationFilter('cl.DGRSDT', DGRSDT);

  // Numeric filters
  const addRangeFilter = (field, min, max) => {
    if (min) {
      query += ` AND p.${field} >= ?`;
      params.push(min);
    }
    if (max) {
      query += ` AND p.${field} <= ?`;
      params.push(max);
    }
  };

  addRangeFilter('nombre_pages', Pagemin, Pagemax);
  addRangeFilter('volume', Volummin, Volummax);
  addRangeFilter('Annee', DateMin, DateMax);

  // Period filter
  if (Periodemin && Periodemax) {
    query += ` AND cj.periode LIKE ?`;
    params.push(`%${Periodemin}-${Periodemax}%`);
  }

  // Periodicite filter
  if (Periodicite) {
    query += ` AND cj.periodicite = ?`;
    params.push(Periodicite);
  }

  // Name search
  if (Nomsrc) {
    query += ` AND cj.nom LIKE ?`;
    params.push(`%${Nomsrc}%`);
  }

  // Sorting logic
  const validColumns = ['p.pub_id', 'p.titre', 'p.Annee', 'p.nombre_pages', 'cj.nom'];
  const validOrders = ['ASC', 'DESC'];
  
  const sortColumn = validColumns.includes(Car) ? Car : 'p.Annee';
  const sortOrder = validOrders.includes(Ordre) ? Ordre : 'DESC';

  query += ` ORDER BY ${sortColumn} ${sortOrder}`;
  if (sortColumn !== 'p.pub_id') query += `, p.pub_id DESC`;

  // Execute query
  db.query(query, params, (err, results) => {
    if (err) {
      console.error("Database Error:", err);
      return res.status(500).json({ 
        success: false,
        error: "Database error",
        details: err.message
      });
    }
    res.json(results);
  });
});

// Démarrer le serveur
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });