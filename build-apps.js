// netlify/functions/build-apps.js
// Ova funkcija se pokreće automatski kad se CMS ažurira

const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
    try {
        console.log('🚀 Pokretanje automatske konverzije CMS → JSON...');
        
        // Function to parse YAML frontmatter
        function parseFrontmatter(content) {
            const fmRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
            const match = content.match(fmRegex);
            
            if (!match) return null;
            
            const frontmatter = {};
            const yamlContent = match[1];
            
            // Simple YAML parser
            yamlContent.split('\n').forEach(line => {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim();
                    let value = line.substring(colonIndex + 1).trim();
                    
                    // Remove quotes if present
                    if ((value.startsWith('"') && value.endsWith('"')) || 
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    
                    // Convert boolean strings
                    if (value === 'true') value = true;
                    if (value === 'false') value = false;
                    
                    frontmatter[key] = value;
                }
            });
            
            return frontmatter;
        }

        // Read all CMS markdown files
        const apps = [];
        const cmsPaths = ['apps', 'sadrzaj/aplikacije'];
        
        for (const cmsPath of cmsPaths) {
            try {
                const files = await fs.readdir(cmsPath);
                
                for (const file of files) {
                    if (file.endsWith('.md')) {
                        const filePath = path.join(cmsPath, file);
                        const content = await fs.readFile(filePath, 'utf8');
                        const parsed = parseFrontmatter(content);
                        
                        if (parsed && parsed.title) {
                            // Ensure all required fields
                            const app = {
                                title: parsed.title,
                                description: parsed.description || '',
                                url: parsed.url || '',
                                icon: parsed.icon || '🌐',
                                category: parsed.category || 'Ostalo',
                                status: parsed.status || 'Active',
                                featured: parsed.featured === true,
                                date: parsed.date || new Date().toISOString()
                            };
                            
                            apps.push(app);
                            console.log(`✅ Dodano: ${app.title}`);
                        }
                    }
                }
            } catch (err) {
                console.log(`ℹ️ Folder ${cmsPath} ne postoji ili je prazan`);
            }
        }

        // Sort apps - featured first, then by date
        apps.sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return new Date(b.date) - new Date(a.date);
        });

        // Write to apps.json
        await fs.writeFile('apps.json', JSON.stringify(apps, null, 2));
        
        console.log(`🎉 Uspješno generirano apps.json s ${apps.length} aplikacija`);

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                message: `Generated apps.json with ${apps.length} applications`,
                apps: apps
            })
        };

    } catch (error) {
        console.error('❌ Greška:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                success: false, 
                error: error.message 
            })
        };
    }
};
