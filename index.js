require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');

// Zentrale SOG Konfiguration
class SOGConfig {
    static get LOGO_URL() {
        return 'https://ibb.co/23r4WyxL';
    }
    
    static get BRAND_COLOR() {
        return '#0099ff';
    }
    
    static get SUCCESS_COLOR() {
        return '#00ff88';
    }
    
    static get ERROR_COLOR() {
        return '#ff4444';
    }
    
    static get WARNING_COLOR() {
        return '#ffaa00';
    }
    
    static get BRAND_NAME() {
        return 'SOG Minecraft Server';
    }
    
    static get BOT_NAME() {
        return 'SOG Admin Bot';
    }
    
    static getServerInfo() {
        return {
            java: 'opsucht.net',
            bedrock: 'opsucht.net:19132',
            website: 'www.sog-minecraft.de'
        };
    }
}

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers // <-- Damit neue User erkannt werden!
    ] 
});

// Datenbank für Warns und andere Daten
let warns = {};
let tickets = {};
let applications = {};
let channelConfig = {};
let verificationData = {};

// Slash Commands definieren
const commands = [
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('⚠️ Gibt einem User eine Warnung')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Der User, der gewarnt werden soll')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('grund')
                .setDescription('Grund für die Warnung')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('warns')
        .setDescription('📋 Zeigt Warns eines Users an')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Der User, dessen Warns angezeigt werden sollen')
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('role')
        .setDescription('🎭 Gibt einem User eine Rolle')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Der User, der die Rolle bekommen soll')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('rolle')
                .setDescription('Name der Rolle')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('💥 Löscht den aktuellen Channel komplett (nur Admins)'),
    
    new SlashCommandBuilder()
        .setName('setuptickets')
        .setDescription('🎫 Richtet das Ticket-System ein (nur Admins)'),
    
    new SlashCommandBuilder()
        .setName('regeln')
        .setDescription('📋 Zeigt die Server-Regeln an'),
    
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('🏓 Zeigt die Bot-Latenz an'),
    
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('❓ Zeigt alle verfügbaren Befehle an'),
    
    new SlashCommandBuilder()
        .setName('here')
        .setDescription('📍 Weist einem Channel eine spezielle Funktion zu (nur Admins)')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Der Channel, der zugewiesen werden soll')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Art des Channels')
                .setRequired(true)
                .addChoices(
                    { name: '🎫 Ticket-User Channel', value: 'ticket-user' },
                    { name: '📋 Ticket-Log Admin', value: 'ticket-log-admin' },
                    { name: '📝 Command-Log', value: 'command-log' },
                    { name: '🧪 Dev-Test', value: 'dev-test' },

                    { name: '✅ Verify Channel', value: 'verify' },
                    { name: '📝 Bewerbung Channel', value: 'bewerbung' }
                )),
    
    new SlashCommandBuilder()
        .setName('verify')
        .setDescription('✅ Verifiziert einen User (nur Admins)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Der User, der verifiziert werden soll')
                .setRequired(true))
    ,
    new SlashCommandBuilder()
        .setName('assignunverified')
        .setDescription('🔒 Weist allen Usern ohne Rollen die Unverified-Rolle zu (nur Admins)')
        .addStringOption(option =>
            option.setName('confirm')
                .setDescription('Gib "ASSIGN" ein, um zu bestätigen')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('assignunverifiedall')
        .setDescription('🔒 Weist ALLEN Usern die Unverified-Rolle zu (auch Admins) (nur Admins)')
        .addStringOption(option =>
            option.setName('confirm')
                .setDescription('Gib "ASSIGNALL" ein, um zu bestätigen')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('serverreset')
        .setDescription('⚠️ Setzt den Server komplett zurück (löscht ALLES!) (nur Admins)')
        .addStringOption(option =>
            option.setName('confirm')
                .setDescription('Gib "RESET" ein, um zu bestätigen')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('serversetup')
        .setDescription('🔧 Erstellt alle Standard-Rollen und Channels (nur Admins)')
        .addStringOption(option =>
            option.setName('confirm')
                .setDescription('Gib "SETUP" ein, um zu bestätigen')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('setupunverified')
        .setDescription('🔒 Richtet das Unverified-System ein (nur Admins)')
        .addStringOption(option =>
            option.setName('confirm')
                .setDescription('Gib "UNVERIFIED" ein, um zu bestätigen')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('roll')
        .setDescription('📋 Zeigt alle Rollen eines Users an')
        .addUserOption(option =>
            option.setName('username')
                .setDescription('Der User, dessen Rollen angezeigt werden sollen')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('rolemanage')
        .setDescription('🎭 Rollen-Management (nur Admins)')
        .addUserOption(option =>
            option.setName('username')
                .setDescription('Der User, der die Rolle bekommen soll')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Aktion: create, add, remove')
                .setRequired(true)
                .addChoices(
                    { name: '➕ Erstellen & Zuweisen', value: 'create' },
                    { name: '➕ Nur Zuweisen', value: 'add' },
                    { name: '➖ Entfernen', value: 'remove' }
                ))
        .addStringOption(option =>
            option.setName('rolename')
                .setDescription('Name der Rolle')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('permissions')
                .setDescription('Berechtigungen (z.B. "send_messages,read_messages")')
                .setRequired(false)),
];

// Lade gespeicherte Daten
function loadData() {
    try {
        if (fs.existsSync('./data/warns.json')) {
            warns = JSON.parse(fs.readFileSync('./data/warns.json', 'utf8'));
        }
        if (fs.existsSync('./data/tickets.json')) {
            tickets = JSON.parse(fs.readFileSync('./data/tickets.json', 'utf8'));
        }
        if (fs.existsSync('./data/applications.json')) {
            applications = JSON.parse(fs.readFileSync('./data/applications.json', 'utf8'));
        }
        if (fs.existsSync('./data/channelConfig.json')) {
            channelConfig = JSON.parse(fs.readFileSync('./data/channelConfig.json', 'utf8'));
        }
        if (fs.existsSync('./data/verificationData.json')) {
            verificationData = JSON.parse(fs.readFileSync('./data/verificationData.json', 'utf8'));
        }
    } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
    }
}

// Speichere Daten
function saveData() {
    try {
        if (!fs.existsSync('./data')) {
            fs.mkdirSync('./data');
        }
        fs.writeFileSync('./data/warns.json', JSON.stringify(warns, null, 2));
        fs.writeFileSync('./data/tickets.json', JSON.stringify(tickets, null, 2));
        fs.writeFileSync('./data/applications.json', JSON.stringify(applications, null, 2));
        fs.writeFileSync('./data/channelConfig.json', JSON.stringify(channelConfig, null, 2));
        fs.writeFileSync('./data/verificationData.json', JSON.stringify(verificationData, null, 2));
    } catch (error) {
        console.error('Fehler beim Speichern der Daten:', error);
    }
}

// Funktion zum Erstellen der notwendigen Channels für Unverified User
async function createUnverifiedChannels(guild) {
    try {
        // Suche nach Unverified Rolle
        let unverifiedRole = guild.roles.cache.find(role => 
            role.name.toLowerCase().includes('unverified') ||
            role.name.toLowerCase().includes('nicht verifiziert') ||
            role.name.toLowerCase().includes('unbestätigt')
        );
        
        // Erstelle Unverified Rolle falls nicht vorhanden
        if (!unverifiedRole) {
            unverifiedRole = await guild.roles.create({
                name: '🔒 Unverified',
                color: '#808080',
                reason: 'Automatische Erstellung für Unverified User',
                permissions: []
            });
        }
        
        // Prüfe ob Welcome Channel existiert
        let welcomeChannel = guild.channels.cache.find(channel => 
            channel.name.toLowerCase().includes('welcome') || 
            channel.name.toLowerCase().includes('willkommen')
        );
        
        // Erstelle Welcome Channel falls nicht vorhanden
        if (!welcomeChannel) {
            welcomeChannel = await guild.channels.create({
                name: '🎉-willkommen',
                type: ChannelType.GuildText,
                reason: 'Automatische Erstellung für neue Mitglieder',
                permissionOverwrites: [
                    {
                        id: unverifiedRole.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.UseExternalEmojis,
                            PermissionFlagsBits.AddReactions
                        ]
                    },
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            });
            console.log(`✅ Welcome Channel erstellt: ${welcomeChannel.name}`);
        }
        
        // Prüfe ob Unverified Channel existiert
        let unverifiedChannel = guild.channels.cache.find(channel => 
            channel.name.toLowerCase().includes('unverified') || 
            channel.name.toLowerCase().includes('unbestätigt') ||
            channel.name.toLowerCase().includes('nicht verifiziert')
        );
        
        // Erstelle Unverified Channel falls nicht vorhanden
        if (!unverifiedChannel) {
            unverifiedChannel = await guild.channels.create({
                name: '🔒-unverified',
                type: ChannelType.GuildText,
                reason: 'Automatische Erstellung für Unverified User',
                permissionOverwrites: [
                    {
                        id: unverifiedRole.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.UseExternalEmojis,
                            PermissionFlagsBits.AddReactions
                        ]
                    },
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    }
                ]
            });
            console.log(`✅ Unverified Channel erstellt: ${unverifiedChannel.name}`);
        }
        
        console.log('✅ Unverified Channels Setup abgeschlossen');
    } catch (error) {
        console.error('❌ Fehler beim Erstellen der Unverified Channels:', error);
    }
}

// Funktion zum Setzen der Channel-Berechtigungen für Unverified User
async function setupUnverifiedPermissions(guild) {
    try {
        // Suche nach Unverified Rolle
        let unverifiedRole = guild.roles.cache.find(role => 
            role.name.toLowerCase().includes('unverified') ||
            role.name.toLowerCase().includes('nicht verifiziert') ||
            role.name.toLowerCase().includes('unbestätigt')
        );
        if (!unverifiedRole) {
            unverifiedRole = await guild.roles.create({
                name: '🔒 Unverified',
                color: '#808080',
                reason: 'Automatische Erstellung für Unverified User',
                permissions: []
            });
        }
        for (const channel of guild.channels.cache.values()) {
            try {
                const isWelcomeChannel = channel.name.toLowerCase().includes('welcome') || 
                                       channel.name.toLowerCase().includes('willkommen');
                const isUnverifiedChannel = channel.name.toLowerCase().includes('unverified') || 
                                          channel.name.toLowerCase().includes('unbestätigt') ||
                                          channel.name.toLowerCase().includes('nicht verifiziert');
                const isVerifyChannel = channel.name.toLowerCase().includes('verify') || 
                                      channel.name.toLowerCase().includes('verifizierung');
                if (isWelcomeChannel || isUnverifiedChannel || isVerifyChannel) {
                    // Prüfe, ob die Overwrites schon so gesetzt sind
                    const current = channel.permissionOverwrites.cache.get(unverifiedRole.id);
                    if (!current || !current.allow.has(PermissionFlagsBits.ViewChannel)) {
                    await channel.permissionOverwrites.create(unverifiedRole, {
                        ViewChannel: true,
                            SendMessages: false, // Keine Schreibberechtigung im Welcome
                            ReadMessageHistory: true,
                            UseExternalEmojis: true,
                            AddReactions: true
                        });
                        console.log(`✅ Berechtigungen für Unverified in Channel: ${channel.name}`);
                    }
                } else {
                    // Prüfe, ob die Overwrites schon so gesetzt sind
                    const everyoneCurrent = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
                    const unverifiedCurrent = channel.permissionOverwrites.cache.get(unverifiedRole.id);
                    let needsUpdate = false;
                    if (!everyoneCurrent || !everyoneCurrent.deny.has(PermissionFlagsBits.ViewChannel)) needsUpdate = true;
                    if (!unverifiedCurrent || !unverifiedCurrent.deny.has(PermissionFlagsBits.ViewChannel)) needsUpdate = true;
                    if (needsUpdate) {
                        await channel.permissionOverwrites.set([
                            {
                                id: guild.roles.everyone.id,
                                deny: [PermissionFlagsBits.ViewChannel]
                            },
                            {
                                id: unverifiedRole.id,
                                deny: [PermissionFlagsBits.ViewChannel]
                            }
                        ]);
                        console.log(`❌ Channel versteckt für Everyone und Unverified: ${channel.name}`);
                    }
                }
            } catch (error) {
                console.error(`❌ Fehler beim Setzen der Berechtigungen für Channel ${channel.name}:`, error);
            }
        }
        console.log('✅ Channel-Berechtigungen für Unverified User gesetzt');
    } catch (error) {
        console.error('❌ Fehler beim Setzen der Unverified-Berechtigungen:', error);
    }
}

// Funktion zum automatischen Zuweisen der Unverified-Rolle an alle User
async function assignUnverifiedToAllUsers(guild) {
    try {
        console.log(`🔄 Weise allen Usern die Unverified-Rolle zu für ${guild.name}...`);
        
        // Suche nach Unverified Rolle
        let unverifiedRole = guild.roles.cache.find(role => 
            role.name.toLowerCase().includes('unverified') ||
            role.name.toLowerCase().includes('nicht verifiziert') ||
            role.name.toLowerCase().includes('unbestätigt')
        );
        
        // Erstelle Unverified Rolle falls nicht vorhanden
        if (!unverifiedRole) {
            unverifiedRole = await guild.roles.create({
                name: '🔒 Unverified',
                color: '#808080',
                reason: 'Automatische Erstellung für alle User',
                permissions: []
            });
            console.log(`✅ Unverified-Rolle erstellt für ${guild.name}`);
        }
        
        let assignedCount = 0;
        let failedCount = 0;
        let skippedCount = 0;
        
        // Gehe durch alle Mitglieder
        for (const member of guild.members.cache.values()) {
            // Überspringe Bots
            if (member.user.bot) {
                skippedCount++;
                continue;
            }
            
            // Prüfe ob User bereits die Unverified-Rolle hat
            if (member.roles.cache.has(unverifiedRole.id)) {
                skippedCount++;
                continue;
            }
            
            // Prüfe ob User Admin ist (überspringe Admins)
            const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
            if (isAdmin) {
                skippedCount++;
                continue;
            }
            
            // Weise Unverified-Rolle zu
            try {
                await member.roles.add(unverifiedRole);
                assignedCount++;
                console.log(`✅ Unverified-Rolle zugewiesen an ${member.user.username}`);
            } catch (error) {
                failedCount++;
                console.error(`❌ Fehler beim Zuweisen der Unverified-Rolle an ${member.user.username}:`, error);
            }
        }
        
        console.log(`✅ Unverified-Rollen zugewiesen für ${guild.name}: ${assignedCount} erfolgreich, ${failedCount} fehlgeschlagen, ${skippedCount} übersprungen`);
        return { assignedCount, failedCount, skippedCount };
        
    } catch (error) {
        console.error(`❌ Fehler beim Zuweisen der Unverified-Rollen für ${guild.name}:`, error);
        return { assignedCount: 0, failedCount: 0, skippedCount: 0 };
    }
}

// Admin-Rolle hinzufügen, falls nicht vorhanden
async function addAdminRoleIfMissing(guild) {
    let adminRole = guild.roles.cache.find(role => 
        role.name.toLowerCase().includes('admin') ||
        role.name.toLowerCase().includes('administrator') ||
        role.name.includes('🛡️ Admin')
    );
    if (!adminRole) {
        try {
            adminRole = await guild.roles.create({
                name: '🛡️ Admin',
                color: '#ff0000',
                permissions: [PermissionFlagsBits.Administrator],
                reason: 'Automatische Erstellung der Admin-Rolle'
            });
            console.log(`✅ Admin-Rolle erstellt für ${guild.name}`);
        } catch (error) {
            console.error(`❌ Fehler beim Erstellen der Admin-Rolle für ${guild.name}:`, error);
        }
    }
    return adminRole;
}

client.once('ready', async () => {
    console.log('🎮 SOG Admin Bot ist online!');
    console.log('📊 Bot Status: Aktiv');
    console.log('🔧 Slash Commands werden registriert...');
    loadData();
    
    // Registriere Slash Commands
    try {
        await client.application.commands.set(commands);
        console.log('✅ Slash Commands erfolgreich registriert!');
        
        // Automatisches Server Setup für alle Guilds
        client.guilds.cache.forEach(async (guild) => {
            await addAdminRoleIfMissing(guild);
            try {
                console.log(`🔄 Automatisches Server Setup für ${guild.name}...`);
                
                // Prüfe Bot-Berechtigungen und setze sie automatisch
                const botMember = guild.members.me;
                if (botMember) {
                    // Erstelle Bot-Rolle mit allen Berechtigungen falls nicht vorhanden
                    let botRole = guild.roles.cache.find(role => 
                        role.name.toLowerCase().includes('bot') || 
                        role.name.toLowerCase().includes('sog bot') ||
                        role.managed
                    );
                    
                    if (!botRole) {
                        try {
                            botRole = await guild.roles.create({
                                name: '🤖 SOG Bot',
                                color: '#00ff88',
                                permissions: [
                                    PermissionFlagsBits.Administrator,
                                    PermissionFlagsBits.ManageGuild,
                                    PermissionFlagsBits.ManageRoles,
                                    PermissionFlagsBits.ManageChannels,
                                    PermissionFlagsBits.ManageMessages,
                                    PermissionFlagsBits.KickMembers,
                                    PermissionFlagsBits.BanMembers,
                                    PermissionFlagsBits.ViewAuditLog,
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.UseSlashCommands
                                ],
                                reason: 'Automatische Bot-Rolle für SOG Admin Bot'
                            });
                            console.log(`✅ Bot-Rolle erstellt für ${guild.name}`);
                        } catch (error) {
                            console.error(`❌ Fehler beim Erstellen der Bot-Rolle für ${guild.name}:`, error);
                        }
                    }
                    
                    // Weise Bot-Rolle dem Bot zu falls nicht vorhanden
                    if (botRole && !botMember.roles.cache.has(botRole.id)) {
                        try {
                            await botMember.roles.add(botRole);
                            console.log(`✅ Bot-Rolle zugewiesen für ${guild.name}`);
                        } catch (error) {
                            console.error(`❌ Fehler beim Zuweisen der Bot-Rolle für ${guild.name}:`, error);
                        }
                    }
                    
                    // Setze Bot-Rolle ganz nach oben in der Hierarchie
                    try {
                        await botRole.setPosition(guild.roles.cache.size - 1);
                        console.log(`✅ Bot-Rolle nach oben verschoben für ${guild.name}`);
                    } catch (error) {
                        console.error(`❌ Fehler beim Verschieben der Bot-Rolle für ${guild.name}:`, error);
                    }
                }
                
                // Setze Channel-Berechtigungen für Unverified User
                await setupUnverifiedPermissions(guild);
                
                // Weise allen bestehenden Usern die Unverified-Rolle zu
                await assignUnverifiedToAllUsers(guild);
                
                console.log(`✅ Automatisches Server Setup für ${guild.name} abgeschlossen!`);
                
            } catch (error) {
                console.error(`❌ Fehler beim automatischen Server Setup für ${guild.name}:`, error);
            }
        });
        
        console.log('🚀 Bot ist bereit für den Einsatz!');
        console.log('🔧 Automatisches Server Setup aktiviert - Bot richtet alles selbst ein!');
    } catch (error) {
        console.error('❌ Fehler beim Registrieren der Slash Commands:', error);
    }
});

// Willkomensnachricht mit Regelwerk-Akzeptierung und Unverified Rolle
client.on('guildMemberAdd', async (member) => {
    // Logge den neuen User
    console.log(`👤 [JOIN] Neuer User: ${member.user.username} (${member.user.id}) ist dem Server beigetreten.`);
    
    try {
        // Suche nach Unverified Rolle
        let unverifiedRole = member.guild.roles.cache.find(role => 
            role.name.toLowerCase().includes('unverified') ||
            role.name.toLowerCase().includes('nicht verifiziert') ||
            role.name.toLowerCase().includes('unbestätigt')
        );
        
        // Erstelle Unverified Rolle falls nicht vorhanden
        if (!unverifiedRole) {
            unverifiedRole = await member.guild.roles.create({
                name: '🔒 Unverified',
                color: '#808080',
                reason: 'Automatische Erstellung für neue Mitglieder',
                permissions: []
            });
            console.log(`✅ [ROLE] Unverified-Rolle erstellt für ${member.guild.name}`);
        }
        
        // Weise Unverified Rolle zu
        await member.roles.add(unverifiedRole);
        console.log(`✅ [ROLE] Unverified-Rolle zugewiesen an ${member.user.username} (${member.user.id})`);
        
        // Erstelle notwendige Channels falls nicht vorhanden
        await createUnverifiedChannels(member.guild);
        
        // Setze Channel-Berechtigungen für den neuen User
        await setupUnverifiedPermissions(member.guild);
        console.log(`✅ [PERMISSIONS] Channel-Berechtigungen für ${member.user.username} gesetzt`);
        
    } catch (error) {
        console.error(`❌ [ERROR] Fehler beim Zuweisen der Unverified-Rolle an ${member.user.username} (${member.user.id}):`, error);
    }
    
    const welcomeChannel = member.guild.channels.cache.find(channel => 
        channel.name.toLowerCase().includes('welcome') || 
        channel.name.toLowerCase().includes('willkommen')
    );
    
    if (welcomeChannel) {
        // Prüfe, ob die Willkommensnachricht schon existiert
        let alreadySent = false;
        try {
            const messages = await welcomeChannel.messages.fetch({ limit: 20 });
            alreadySent = messages.some(msg => msg.embeds && msg.embeds[0] && msg.embeds[0].title && msg.embeds[0].title.includes('Willkommen bei SOG!'));
        } catch (e) { /* ignore */ }
        if (!alreadySent) {
        const welcomeEmbed = new EmbedBuilder()
            .setColor(SOGConfig.SUCCESS_COLOR)
            .setTitle('🎉 Willkommen bei SOG!')
                .setDescription(`**Hallo ${member.user.username}!** 👋\n\nWillkommen auf dem **${SOGConfig.BRAND_NAME}**!\n\n**🎯 Was erwartet dich:**\n• 🏗️ **Clan-System** mit eigenen Plots\n• 🎮 **Minecraft Server** mit Mods\n• 👥 **Aktive Community**\n• 🛡️ **Fair Play** & Anti-Griefing**\n\n**📋 Nächste Schritte:**\n1️⃣ Akzeptiere das Regelwerk\n2️⃣ Bewerbe dich für einen Clan\n3️⃣ Erstelle ein Ticket bei Fragen`)
            .addFields(
                    { name: '🎮 Java Server', value: `\`${SOGConfig.getServerInfo().java}\``, inline: true },
                    { name: '📱 Bedrock Server', value: `\`${SOGConfig.getServerInfo().bedrock}\``, inline: true }
            )
            .setFooter({ text: `${SOGConfig.BRAND_NAME} • Willkommen im Team!`, iconURL: SOGConfig.LOGO_URL })
            .setTimestamp();
        const ruleButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('accept_rules')
                    .setLabel('✅ Regelwerk akzeptieren')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('apply_clan')
                    .setLabel('📝 Clan bewerben')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏗️')
            );
        await welcomeChannel.send({ embeds: [welcomeEmbed], components: [ruleButton] });
        }
    }
});

// Slash Command Handler
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        switch (commandName) {
            case 'warn':
                // Automatische Berechtigungsprüfung und -vergabe
                try {
                    const botMember = interaction.guild.members.me;
                    if (botMember) {
                        // Prüfe ob Bot Administrator-Rechte hat
                        if (!botMember.permissions.has(PermissionFlagsBits.Administrator)) {
                            // Versuche Bot-Rolle zu erstellen/zuweisen
                            let botRole = interaction.guild.roles.cache.find(role => 
                                role.name.toLowerCase().includes('bot') || 
                                role.name.toLowerCase().includes('sog bot') ||
                                role.managed
                            );
                            
                            if (!botRole) {
                                botRole = await interaction.guild.roles.create({
                                    name: '🤖 SOG Bot',
                                    color: '#00ff88',
                                    permissions: [PermissionFlagsBits.Administrator],
                                    reason: 'Automatische Bot-Berechtigungen'
                                });
                            }
                            
                            if (botRole && !botMember.roles.cache.has(botRole.id)) {
                                await botMember.roles.add(botRole);
                            }
                            
                            // Setze Bot-Rolle nach oben
                            await botRole.setPosition(interaction.guild.roles.cache.size - 1);
                        }
                    }
                } catch (error) {
                    console.error('❌ Fehler bei automatischer Berechtigungsvergabe:', error);
                }
                
                if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Keine Berechtigung')
                        .setDescription('Du hast keine Berechtigung für diesen Befehl!')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    return interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                
                const user = interaction.options.getUser('user');
                const reason = interaction.options.getString('grund');
                
                if (!warns[interaction.guild.id]) {
                    warns[interaction.guild.id] = {};
                }
                if (!warns[interaction.guild.id][user.id]) {
                    warns[interaction.guild.id][user.id] = [];
                }
                
                warns[interaction.guild.id][user.id].push({
                    reason: reason,
                    moderator: interaction.user.id,
                    timestamp: Date.now()
                });
                
                saveData();
                
                const warnEmbed = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle('⚠️ Warn vergeben')
                    .setDescription(`**User:** ${user.username}\n**Grund:** ${reason}\n**Moderator:** ${interaction.user.username}`)
                    .addFields(
                        { name: '📅 Datum', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
                        { name: '👮 Moderator', value: `${interaction.user.username}`, inline: true }
                    )
                    .setFooter({ text: 'SOG Admin Bot • Warn System', iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [warnEmbed] });
                break;

            case 'warns':
                const targetUser = interaction.options.getUser('user') || interaction.user;
                
                if (!warns[interaction.guild.id] || !warns[interaction.guild.id][targetUser.id] || warns[interaction.guild.id][targetUser.id].length === 0) {
                    const noWarnsEmbed = new EmbedBuilder()
                        .setColor('#00ff88')
                        .setTitle('✅ Keine Warns')
                        .setDescription(`${targetUser.username} hat keine Warns.`)
                        .setFooter({ text: 'SOG Admin Bot • Warn System', iconURL: interaction.guild.iconURL() })
                        .setTimestamp();
                    return interaction.reply({ embeds: [noWarnsEmbed], flags: 64 });
                }
                
                const warnList = warns[interaction.guild.id][targetUser.id].map((warn, index) => 
                    `**${index + 1}.** ${warn.reason} \n└ *${new Date(warn.timestamp).toLocaleDateString('de-DE')}*`
                ).join('\n\n');
                
                const warnEmbed2 = new EmbedBuilder()
                    .setColor('#ff9900')
                    .setTitle(`📋 Warns von ${targetUser.username}`)
                    .setDescription(warnList)
                    .addFields(
                        { name: '📊 Gesamt', value: `${warns[interaction.guild.id][targetUser.id].length} Warn(s)`, inline: true },
                        { name: '🆔 User ID', value: `\`${targetUser.id}\``, inline: true }
                    )
                    .setFooter({ text: 'SOG Admin Bot • Warn System', iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [warnEmbed2], flags: 64 });
                break;

            case 'role':
                if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Keine Berechtigung')
                        .setDescription('Du hast keine Berechtigung für diesen Befehl!')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    return interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                
                const roleUser = interaction.options.getUser('user');
                const roleName = interaction.options.getString('rolle');
                
                const role = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
                
                if (!role) {
                    const roleErrorEmbed = new EmbedBuilder()
                        .setColor('#ff4444')
                        .setTitle('❌ Rolle nicht gefunden')
                        .setDescription(`Die Rolle **${roleName}** wurde nicht gefunden!`)
                        .setFooter({ text: 'SOG Admin Bot • Rollenverwaltung', iconURL: interaction.guild.iconURL() })
                        .setTimestamp();
                    return interaction.reply({ embeds: [roleErrorEmbed], flags: 64 });
                }
                
                try {
                    await interaction.guild.members.cache.get(roleUser.id).roles.add(role);
                    const roleSuccessEmbed = new EmbedBuilder()
                        .setColor('#00ff88')
                        .setTitle('✅ Rolle vergeben')
                        .setDescription(`**Rolle:** ${role.name}\n**User:** ${roleUser.username}\n**Moderator:** ${interaction.user.username}`)
                        .addFields(
                            { name: '🎨 Rollenfarbe', value: `\`${role.hexColor}\``, inline: true },
                            { name: '🆔 Rollen ID', value: `\`${role.id}\``, inline: true },
                            { name: '👮 Moderator', value: `${interaction.user.username}`, inline: true }
                        )
                        .setFooter({ text: 'SOG Admin Bot • Rollenverwaltung', iconURL: interaction.guild.iconURL() })
                        .setTimestamp();
                    await interaction.reply({ embeds: [roleSuccessEmbed], flags: 64 });
                } catch (error) {
                    const roleErrorEmbed = new EmbedBuilder()
                        .setColor('#ff4444')
                        .setTitle('❌ Fehler')
                        .setDescription('Fehler beim Vergeben der Rolle!')
                        .setFooter({ text: 'SOG Admin Bot • Rollenverwaltung', iconURL: interaction.guild.iconURL() })
                        .setTimestamp();
                    await interaction.reply({ embeds: [roleErrorEmbed], flags: 64 });
                }
                break;

            case 'nuke':
                if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Keine Berechtigung')
                        .setDescription('Nur Administratoren können diesen Befehl nutzen!')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    return interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                
                const channel = interaction.channel;
                
                try {
                    const newChannel = await channel.clone();
                    await channel.delete();
                    
                    const nukeEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('💥 Channel genuked!')
                        .setDescription('Dieser Channel wurde von einem Administrator genuked.')
                        .addFields(
                            { name: '👮 Administrator', value: `${interaction.user.username}`, inline: true },
                            { name: '📅 Datum', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                        )
                        .setFooter({ text: 'SOG Admin Bot • Nuke System', iconURL: interaction.guild.iconURL() })
                        .setTimestamp();
                    
                    await newChannel.send({ embeds: [nukeEmbed] });
                } catch (error) {
                    const nukeErrorEmbed = new EmbedBuilder()
                        .setColor('#ff4444')
                        .setTitle('❌ Fehler')
                        .setDescription('Fehler beim Nuken des Channels!')
                        .setFooter({ text: 'SOG Admin Bot • Nuke System', iconURL: interaction.guild.iconURL() })
                        .setTimestamp();
                    await interaction.reply({ embeds: [nukeErrorEmbed], flags: 64 });
                }
                break;

            case 'setuptickets':
                if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Keine Berechtigung')
                        .setDescription('Nur Administratoren können diesen Befehl nutzen!')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    return interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                
                const ticketEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🎫 Ticket System')
                    .setDescription('**Willkommen beim SOG Support System!**\n\n**📋 Wie es funktioniert:**\n• Klicke auf den Button unten\n• Ein privater Channel wird erstellt\n• Support wird sich bei dir melden\n\n**🎯 Wofür Tickets:**\n• 🆘 **Technische Probleme**\n• 💰 **Spenden & Premium**\n• 🏗️ **Clan Bewerbungen**\n• 🛡️ **Reports & Appeals**\n• ❓ **Allgemeine Fragen**')
                    .addFields(
                        { name: '⏰ Antwortzeit', value: 'Normalerweise < 24h', inline: true },
                        { name: '👥 Support Team', value: 'Admins & Moderatoren', inline: true },
                        { name: '📝 Hinweis', value: 'Sei geduldig und höflich', inline: true }
                    )
                    .setFooter({ text: 'SOG Admin Bot • Ticket System', iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                
                const ticketButton = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('create_ticket')
                            .setLabel('🎫 Ticket erstellen')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('🎫')
                    );
                
                await interaction.reply({ embeds: [ticketEmbed], components: [ticketButton] });
                break;

            case 'regeln':
                const rulesEmbed = new EmbedBuilder()
                    .setColor(SOGConfig.BRAND_COLOR)
                    .setTitle('📋 SOG Server Regeln')
                    .setDescription(`
**📎 Allgemeines**
Mit der Nutzung des Servers akzeptierst du die Nutzungsbedingungen von Discord sowie die Ingame Guidelines.

**💡 Verhalten im Chat & Voice**
• Freundlichkeit ist Pflicht – kein Mobbing, keine Beleidigungen
• Kein Spam, keine unangemessene Sprache, kein Trollen
• @everyone und @here dürfen nur von autorisierten Personen verwendet werden

**🧱 CLAN-PLOT-REGELN**
• Griefing und mutwillige Zerstörung sind strengstens verboten
• Beleidigende oder unangemessene Bauwerke sind nicht erlaubt
• Öffentliche Farmen sind für alle da

**🎮 MINECRAFT SERVER REGELN**
• Kein Griefing oder Stehlen von anderen Spielern
• Keine unangemessenen Bauwerke oder Namen
• Respektiere die Arbeit anderer Spieler
• Keine Hacks, Cheats oder Mods die andere benachteiligen

**🛡️ MODERATION**
• Admins und Moderatoren haben das letzte Wort
• Verstöße führen zu Warns, Kicks oder Bans
• Bei Fragen erstelle ein Ticket

**📅 Stand: Juli 2025**
                    `)
                    .addFields(
                        { name: '⚠️ Wichtig', value: 'Verstöße führen zu Warns, Kicks oder Bans', inline: true },
                        { name: '🛡️ Fair Play', value: 'Respektiere alle Spieler', inline: true },
                        { name: '📞 Support', value: 'Bei Fragen erstelle ein Ticket', inline: true }
                    )
                    .setFooter({ text: `${SOGConfig.BOT_NAME} • Server Regeln`, iconURL: SOGConfig.LOGO_URL })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [rulesEmbed] });
                break;

            case 'ping':
                const pingEmbed = new EmbedBuilder()
                    .setColor(SOGConfig.SUCCESS_COLOR)
                    .setTitle('🏓 Pong!')
                    .setDescription(`**Bot Latenz:** ${Date.now() - interaction.createdTimestamp}ms\n**API Latenz:** ${Math.round(interaction.client.ws.ping)}ms`)
                    .addFields(
                        { name: '🟢 Status', value: 'Online', inline: true },
                        { name: '📊 Uptime', value: '24/7', inline: true },
                        { name: '🆔 Bot ID', value: `\`${interaction.client.user.id}\``, inline: true }
                    )
                    .setFooter({ text: `${SOGConfig.BOT_NAME} • System Status`, iconURL: SOGConfig.LOGO_URL })
                    .setTimestamp();
                await interaction.reply({ embeds: [pingEmbed] });
                break;

            case 'help':
                const helpEmbed = new EmbedBuilder()
                    .setColor(SOGConfig.BRAND_COLOR)
                    .setTitle('❓ SOG Bot Hilfe')
                    .setDescription('**Hier sind alle verfügbaren Befehle:**')
                    .addFields(
                        { name: '👮 Moderator Commands', value: '`/warn` - Warn vergeben\n`/warns` - Warns anzeigen\n`/role` - Rolle vergeben', inline: true },
                        { name: '⚡ Admin Commands', value: '`/nuke` - Channel nuken\n`/setuptickets` - Ticket-System\n`/here` - Channel zuweisen\n`/verify` - User verifizieren\n`/rolemanage` - Rollen verwalten', inline: true },
                        { name: '📋 Allgemeine Commands', value: '`/ping` - Bot-Latenz\n`/regeln` - Server-Regeln\n`/help` - Diese Hilfe\n`/roll` - Rollen anzeigen', inline: true }
                    )
                    .addFields(
                        { name: '🎫 Automatische Features', value: '• Willkomensnachrichten\n• Ticket-System\n• Bewerbungs-System\n• Logging-System\n• Verification System', inline: false },
                        { name: '👑 Rollen-Hierarchie', value: '👑 **Owner** (Server Besitzer)\n👑 **StvOwner** (Stellvertretender Owner)\n👥 **TeamLeitung** (Team Leitung)\n🛡️ **Admin** (Administrator)\n⚔️ **Moderator** (Moderator)\n🎧 **Supporter** (Support)\n✅ **Verified** (Verifizierte User)\n🔒 **Unverified** (Nicht verifiziert)', inline: false }
                    )
                    .setFooter({ text: `${SOGConfig.BOT_NAME} • Hilfe System`, iconURL: SOGConfig.LOGO_URL })
                    .setTimestamp();
                await interaction.reply({ embeds: [helpEmbed] });
                break;

            case 'here':
                if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Keine Berechtigung')
                        .setDescription('Nur Administratoren können diesen Befehl nutzen!')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    return interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                
                const selectedChannel = interaction.options.getChannel('channel');
                const type = interaction.options.getString('type');
                
                if (!channelConfig[interaction.guild.id]) {
                    channelConfig[interaction.guild.id] = {};
                }
                
                channelConfig[interaction.guild.id][type] = selectedChannel.id;
                saveData();
                
                // Wenn es ein verify Channel ist, setze Berechtigungen
                if (type === 'verify') {
                    try {
                        // Entferne alle Berechtigungen für @everyone
                        await selectedChannel.permissionOverwrites.set([
                            {
                                id: interaction.guild.id,
                                deny: [PermissionFlagsBits.ViewChannel],
                            },
                            {
                                id: interaction.guild.roles.cache.find(role => 
                                    role.name.toLowerCase().includes('unverified') ||
                                    role.name.toLowerCase().includes('nicht verifiziert') ||
                                    role.name.toLowerCase().includes('unbestätigt')
                                )?.id || interaction.guild.id,
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                            }
                        ]);
                        console.log(`✅ Verify Channel Berechtigungen gesetzt für ${selectedChannel.name}`);
                    } catch (error) {
                        console.error('❌ Fehler beim Setzen der Verify Channel Berechtigungen:', error);
                    }
                }
                
                // Spezielle Behandlung für Bewerbung Channel
                if (type === 'bewerbung') {
                    const bewerbungEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.BRAND_COLOR)
                        .setTitle('🏗️ SOG Shadow-of-Gods Clan Bewerbung')
                        .setDescription(`**Du suchst einen frischen Clan auf OPSUCHT?**\nTrete noch heute dem **SOG Shadow-of-Gods Clan** bei.\n\n**🔎 Wen wir suchen:**\n• 👨‍🌾 **Aktive Farmer** die für uns Rohstoffe Farmen\n• 🧱 **Builder** die gut bauen können und Spaß am Bauen haben\n\n**✅ Das solltest du mitbringen:**\n• Discord Zugang\n• Lust und Laune\n\n**🏁 Unsere Ziele:**\n• Clan Verifizierung und Aktive Spieler\n• Neue Clan Plots und Shops\n\n**👑 Direkte Ansprechpartner:**\n• **Clan owner:** @Hechti10 👑\n• **Stv-owner:** @Zoxxer_11 👑\n• **Team-Leitung:** @philly5769\n• **Admin:** @NetherKnight943\n\n**📝 Trete noch heute bei** in dem du @NetherKnight943, @philly5769, @Zoxxer_11 oder dem lieben @Hechti10 eine DM schreibst.`)
                        .addFields(
                            { name: '🎯 Clan Name', value: 'SOG Shadow-of-Gods', inline: true },
                            { name: '👥 Mitglieder', value: 'Aktive Community', inline: true },
                            { name: '🏗️ Plots', value: 'Eigene Clan Plots', inline: true }
                        )
                        .setFooter({ text: `${SOGConfig.BOT_NAME} • Clan Bewerbung`, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    
                    const bewerbungButton = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('start_bewerbung')
                                .setLabel('📝 Bewerbung starten')
                                .setStyle(ButtonStyle.Primary)
                                .setEmoji('📝')
                        );
                    
                    await selectedChannel.send({ embeds: [bewerbungEmbed], components: [bewerbungButton] });
                }
                
                const hereEmbed = new EmbedBuilder()
                    .setColor('#00ff88')
                    .setTitle('✅ Channel zugewiesen!')
                    .setDescription(`**Channel:** ${selectedChannel.name}\n**Typ:** ${type}`)
                    .addFields(
                        { name: '📺 Channel', value: selectedChannel.name, inline: true },
                        { name: '🎯 Typ', value: type, inline: true },
                        { name: '🆔 Channel ID', value: `\`${selectedChannel.id}\``, inline: true }
                    )
                    .setFooter({ text: 'SOG Admin Bot • Channel Management', iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [hereEmbed], flags: 64 });
                break;

            case 'verify':
                if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Keine Berechtigung')
                        .setDescription('Nur Administratoren können diesen Befehl nutzen!')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    return interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                
                const verifyUser = interaction.options.getUser('user');
                const member = await interaction.guild.members.fetch(verifyUser.id);
                
                // Entferne unverified Rolle
                const unverifiedRole = interaction.guild.roles.cache.find(role => 
                    role.name.toLowerCase().includes('unverified')
                );
                if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
                    try {
                        await member.roles.remove(unverifiedRole);
                        console.log(`✅ Unverified Rolle entfernt von ${verifyUser.username}`);
                    } catch (error) {
                        console.error('❌ Fehler beim Entfernen der Unverified Rolle:', error);
                    }
                }
                
                // Füge NUR die Verified-Rolle hinzu
                const verifiedRole = interaction.guild.roles.cache.find(role => 
                    role.name.includes('✅ Verified')
                );
                if (verifiedRole) {
                    try {
                        await member.roles.add(verifiedRole);
                    } catch (error) {
                        console.error('❌ Fehler beim Hinzufügen der Spieler-Rolle:', error);
                        const errorEmbed = new EmbedBuilder()
                            .setColor(SOGConfig.ERROR_COLOR)
                            .setTitle('❌ Fehler')
                            .setDescription('Fehler beim Verifizieren. Kontaktiere einen Admin.')
                            .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                            .setTimestamp();
                        return await interaction.reply({ embeds: [errorEmbed], flags: 64 });
                    }
                    
                    // Setze Berechtigungen für alle Channels außer Verify-Channel
                    try {
                        const verifyChannelId = channelConfig[interaction.guild.id]?.['verify'];
                        
                        // Gehe durch alle Channels und setze Berechtigungen
                        for (const channel of interaction.guild.channels.cache.values()) {
                            // Überspringe den Verify-Channel
                            if (verifyChannelId && channel.id === verifyChannelId) {
                                continue;
                            }
                            
                            try {
                                // Setze Berechtigungen für verifizierte User
                                await channel.permissionOverwrites.create(verifiedRole, {
                                    ViewChannel: true,
                                    SendMessages: true,
                                    ReadMessageHistory: true
                                });
                            } catch (error) {
                                console.error(`❌ Fehler beim Setzen der Berechtigungen für Channel ${channel.name}:`, error);
                            }
                        }
                        
                        console.log(`✅ Channel-Berechtigungen gesetzt für ${verifyUser.username}`);
                    } catch (error) {
                        console.error('❌ Fehler beim Setzen der Channel-Berechtigungen:', error);
                    }
                }
                
                const verifyEmbed = new EmbedBuilder()
                    .setColor('#00ff88')
                    .setTitle('✅ User verifiziert!')
                    .setDescription(`**User:** ${verifyUser.username}\n**Moderator:** ${interaction.user.username}`)
                    .addFields(
                        { name: '👤 User', value: verifyUser.username, inline: true },
                        { name: '👮 Moderator', value: interaction.user.username, inline: true },
                        { name: '📅 Datum', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setFooter({ text: 'SOG Admin Bot • Verification System', iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [verifyEmbed], flags: 64 });
                break;

            case 'serverreset':
                // Automatische Bot-Berechtigungen für Reset
                try {
                    const botMember = interaction.guild.members.me;
                    if (botMember) {
                        console.log('🔄 Prüfe Bot-Berechtigungen für Reset...');
                        
                        // Erstelle Bot-Rolle mit allen Berechtigungen
                        let botRole = interaction.guild.roles.cache.find(role => 
                            role.name.toLowerCase().includes('bot') || 
                            role.name.toLowerCase().includes('sog bot') ||
                            role.managed
                        );
                        
                        if (!botRole) {
                            botRole = await interaction.guild.roles.create({
                                name: '🤖 SOG Bot',
                                color: '#00ff88',
                                permissions: [
                                    PermissionFlagsBits.Administrator,
                                    PermissionFlagsBits.ManageGuild,
                                    PermissionFlagsBits.ManageRoles,
                                    PermissionFlagsBits.ManageChannels,
                                    PermissionFlagsBits.ManageMessages,
                                    PermissionFlagsBits.KickMembers,
                                    PermissionFlagsBits.BanMembers,
                                    PermissionFlagsBits.ViewAuditLog,
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.UseSlashCommands
                                ],
                                reason: 'Automatische Bot-Berechtigungen für Reset'
                            });
                            console.log('✅ Bot-Rolle mit Administrator-Rechten erstellt');
                        }
                        
                        // Weise Bot-Rolle dem Bot zu
                        if (botRole && !botMember.roles.cache.has(botRole.id)) {
                            await botMember.roles.add(botRole);
                            console.log('✅ Bot-Rolle zugewiesen');
                        }
                        
                        // Setze Bot-Rolle ganz nach oben
                        await botRole.setPosition(interaction.guild.roles.cache.size - 1);
                        console.log('✅ Bot-Rolle nach oben verschoben');
                        
                        console.log('✅ Bot hat jetzt alle notwendigen Berechtigungen für Reset');
                    }
                } catch (error) {
                    console.error('❌ Fehler bei automatischer Bot-Berechtigungsvergabe:', error);
                }
                
                if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Keine Berechtigung')
                        .setDescription('Nur Administratoren können diesen Befehl nutzen!')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    return interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                
                const confirm = interaction.options.getString('confirm');
                
                if (confirm === 'RESET') {
                    const resetEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.WARNING_COLOR)
                        .setTitle('🔄 Server Reset läuft...')
                        .setDescription('Server wird zurückgesetzt. Dies kann einige Minuten dauern.')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [resetEmbed] });
                    
                    let deletedChannels = 0;
                    let failedChannels = 0;
                    let deletedRoles = 0;
                    let failedRoles = 0;
                    
                    // Lösche zuerst alle Channels
                    const channelsToDelete = interaction.guild.channels.cache.filter(channel => 
                        channel.type !== ChannelType.GuildCategory || channel.children?.cache.size === 0
                    );
                    
                    for (const channel of channelsToDelete.values()) {
                        try {
                            await channel.delete();
                            deletedChannels++;
                            console.log(`✅ Channel gelöscht: ${channel.name}`);
                        } catch (error) {
                            failedChannels++;
                            if (error.code === 50074) {
                                console.log(`⚠️ Channel kann nicht gelöscht werden (Community Server erforderlich): ${channel.name}`);
                            } else if (error.code === 50013) {
                                console.log(`⚠️ Keine Berechtigung zum Löschen von Channel: ${channel.name}`);
                            } else {
                                console.error(`❌ Fehler beim Löschen von Channel ${channel.name}:`, error.message);
                            }
                        }
                    }
                    
                    // Lösche dann alle Rollen außer @everyone und Bot-Rolle
                    const botMember = interaction.guild.members.me;
                    const rolesToDelete = interaction.guild.roles.cache.filter(role => 
                        !role.managed && 
                        role.id !== interaction.guild.id && 
                        role.id !== botMember?.roles.highest.id
                    );
                    
                    for (const role of rolesToDelete.values()) {
                        try {
                            await role.delete();
                            deletedRoles++;
                            console.log(`✅ Rolle gelöscht: ${role.name}`);
                        } catch (error) {
                            failedRoles++;
                            if (error.code === 50013) {
                                console.log(`⚠️ Keine Berechtigung zum Löschen von Rolle: ${role.name} (höhere Hierarchie)`);
                            } else {
                                console.error(`❌ Fehler beim Löschen von Rolle ${role.name}:`, error.message);
                            }
                        }
                    }
                    
                    // Erstelle Ergebnis-Embed
                    const resultEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.SUCCESS_COLOR)
                        .setTitle('✅ Server Reset abgeschlossen')
                        .setDescription('Der Server wurde erfolgreich zurückgesetzt!')
                        .addFields(
                            { name: '🗑️ Gelöschte Channels', value: `${deletedChannels}`, inline: true },
                            { name: '❌ Fehlgeschlagene Channels', value: `${failedChannels}`, inline: true },
                            { name: '👥 Gelöschte Rollen', value: `${deletedRoles}`, inline: true },
                            { name: '❌ Fehlgeschlagene Rollen', value: `${failedRoles}`, inline: true }
                        )
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    
                    // Sende Ergebnis über DM oder erstelle einen neuen Channel
                    try {
                        await interaction.followUp({ embeds: [resultEmbed] });
                    } catch (error) {
                        // Falls der Channel gelöscht wurde, sende DM
                        await interaction.user.send({ embeds: [resultEmbed] });
                    }
                } else {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Fehler')
                        .setDescription('Bestätigungscode falsch oder nicht eingegeben')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    await interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                break;

            case 'serversetup':
                // Automatische Bot-Berechtigungen für Setup
                try {
                    const botMember = interaction.guild.members.me;
                    if (botMember) {
                        console.log('🔄 Prüfe Bot-Berechtigungen für Setup...');
                        
                        // Erstelle Bot-Rolle mit allen Berechtigungen
                        let botRole = interaction.guild.roles.cache.find(role => 
                            role.name.toLowerCase().includes('bot') || 
                            role.name.toLowerCase().includes('sog bot') ||
                            role.managed
                        );
                        
                        if (!botRole) {
                            botRole = await interaction.guild.roles.create({
                                name: '🤖 SOG Bot',
                                color: '#00ff88',
                                permissions: [
                                    PermissionFlagsBits.Administrator,
                                    PermissionFlagsBits.ManageGuild,
                                    PermissionFlagsBits.ManageRoles,
                                    PermissionFlagsBits.ManageChannels,
                                    PermissionFlagsBits.ManageMessages,
                                    PermissionFlagsBits.KickMembers,
                                    PermissionFlagsBits.BanMembers,
                                    PermissionFlagsBits.ViewAuditLog,
                                    PermissionFlagsBits.ViewChannel,
                                    PermissionFlagsBits.SendMessages,
                                    PermissionFlagsBits.ReadMessageHistory,
                                    PermissionFlagsBits.UseSlashCommands
                                ],
                                reason: 'Automatische Bot-Berechtigungen für Setup'
                            });
                            console.log('✅ Bot-Rolle mit Administrator-Rechten erstellt');
                        }
                        
                        // Weise Bot-Rolle dem Bot zu
                        if (botRole && !botMember.roles.cache.has(botRole.id)) {
                            await botMember.roles.add(botRole);
                            console.log('✅ Bot-Rolle zugewiesen');
                        }
                        
                        // Setze Bot-Rolle ganz nach oben
                        await botRole.setPosition(interaction.guild.roles.cache.size - 1);
                        console.log('✅ Bot-Rolle nach oben verschoben');
                        
                        console.log('✅ Bot hat jetzt alle notwendigen Berechtigungen');
                    }
                } catch (error) {
                    console.error('❌ Fehler bei automatischer Bot-Berechtigungsvergabe:', error);
                }
                
                if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Keine Berechtigung')
                        .setDescription('Nur Administratoren können diesen Befehl nutzen!')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    return interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                
                const confirmSetup = interaction.options.getString('confirm');
                
                if (confirmSetup === 'SETUP') {
                    const setupEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.WARNING_COLOR)
                        .setTitle('🛠️ SOG Server Setup läuft...')
                        .setDescription('Der Server wird vollständig eingerichtet. Dies kann einige Minuten dauern.')
                        .addFields(
                            { name: '📋 Was wird erstellt:', value: '• Alle Standardrollen\n• Kategorien & Channels\n• Ticket-System\n• Verify-System\n• Bewerbungs-System\n• Berechtigungen', inline: false }
                        )
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [setupEmbed] });
                    
                    try {
                        // ===== ROLLEN ERSTELLEN =====
                        console.log('🔄 Erstelle Standardrollen...');
                        const rolesToCreate = [
                            { name: '🔒 Unverified', color: '#808080', permissions: [], reason: 'Automatische Unverified Rolle' },
                            { name: '✅ Verified', color: '#00ff88', permissions: [], reason: 'Verifizierte User' },
                            { name: '🎧〢IG | Supporter', color: '#0099ff', permissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers], reason: 'Support Team' },
                            { name: '⚔️〢IG | Moderator', color: '#ff9900', permissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers], reason: 'Moderator Team' },
                            { name: '🛡️ Admin', color: '#ff0000', permissions: [PermissionFlagsBits.Administrator], reason: 'Administrator' },
                            { name: '👥〢IG | TeamLeitung', color: '#ff6600', permissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers, PermissionFlagsBits.BanMembers, PermissionFlagsBits.ManageRoles], reason: 'Team Leitung' },
                            { name: '👑〢IG | StvOwner', color: '#ff00ff', permissions: [PermissionFlagsBits.Administrator], reason: 'Stellvertretender Owner' },
                            { name: '👑〢IG | Owner', color: '#ff00ff', permissions: [PermissionFlagsBits.Administrator], reason: 'Server Owner' },
                            { name: '🌱〢IG | Neuling', color: '#00ff00', permissions: [], reason: 'Neue Mitglieder' },
                            { name: '🔥〢IG | Stammspieler', color: '#ff6600', permissions: [], reason: 'Aktive Spieler' },
                            { name: '💎〢IG | Premium', color: '#00ffff', permissions: [], reason: 'Premium Mitglieder' },
                            { name: '🏆〢IG | VIP', color: '#ffff00', permissions: [], reason: 'VIP Mitglieder' },
                            { name: '🎨〢IG | Designer', color: '#ff00ff', permissions: [], reason: 'Design Team' },
                            { name: '💻〢IG | Entwickler', color: '#0000ff', permissions: [], reason: 'Entwickler Team' },
                            { name: '🎉〢IG | Events', color: '#ff0080', permissions: [], reason: 'Event Team' },
                            { name: '🔔〢IG | News', color: '#8000ff', permissions: [], reason: 'News Team' },
                            { name: '🤝〢IG | Partner', color: '#00ff80', permissions: [], reason: 'Partner' },
                            { name: '🚨〢IG | Gemutet', color: '#ff0000', permissions: [], reason: 'Gemutete User' },
                            { name: 'Quarantine', color: '#ff0000', permissions: [], reason: 'Quarantine für problematische User' }
                        ];
                        
                        const createdRoles = {};
                        for (const roleData of rolesToCreate) {
                            let role = interaction.guild.roles.cache.find(r => r.name === roleData.name);
                            if (!role) {
                                try {
                                    role = await interaction.guild.roles.create({
                                        name: roleData.name,
                                        color: roleData.color,
                                        permissions: roleData.permissions,
                                        reason: roleData.reason
                                    });
                                    console.log(`✅ Rolle erstellt: ${roleData.name}`);
                                } catch (error) {
                                    console.error(`❌ Fehler beim Erstellen der Rolle ${roleData.name}:`, error);
                                }
                            }
                            if (role) createdRoles[roleData.name] = role;
                        }
                        
                        // ===== KATEGORIEN ERSTELLEN =====
                        console.log('🔄 Erstelle Kategorien...');
                        const categoriesToCreate = [
                            { name: '📋 WICHTIG', position: 1 },
                            { name: '🎮 COMMUNITY', position: 2 },
                            { name: '🛠️ SUPPORT', position: 3 },
                            { name: '📊 LOGS', position: 4 },
                            { name: '🎭 ROLLEN', position: 5 },
                            { name: '🏗️ CLAN', position: 6 }
                        ];
                        
                        const createdCategories = {};
                        for (const catData of categoriesToCreate) {
                            let category = interaction.guild.channels.cache.find(c => c.name === catData.name && c.type === ChannelType.GuildCategory);
                            if (!category) {
                                try {
                                    category = await interaction.guild.channels.create({
                                        name: catData.name,
                                        type: ChannelType.GuildCategory,
                                        position: catData.position,
                                        reason: 'Server Setup'
                                    });
                                    console.log(`✅ Kategorie erstellt: ${catData.name}`);
                                } catch (error) {
                                    console.error(`❌ Fehler beim Erstellen der Kategorie ${catData.name}:`, error);
                                }
                            }
                            if (category) createdCategories[catData.name] = category;
                        }
                        
                        // ===== CHANNELS ERSTELLEN =====
                        console.log('🔄 Erstelle Channels...');
                        const channelsToCreate = {
                            '📋 WICHTIG': [
                                { name: '🎉-willkommen', type: ChannelType.GuildText },
                                { name: '✅-verify', type: ChannelType.GuildText },
                                { name: '📜-regeln', type: ChannelType.GuildText },
                                { name: '📢-ankündigungen', type: ChannelType.GuildText }
                            ],
                            '🎮 COMMUNITY': [
                                { name: '💬-chat', type: ChannelType.GuildText },
                                { name: '🎵-musik', type: ChannelType.GuildText },
                                { name: '🎮-gaming', type: ChannelType.GuildText },
                                { name: '🎤-voice-1', type: ChannelType.GuildVoice },
                                { name: '🎤-voice-2', type: ChannelType.GuildVoice },
                                { name: '🎤-afk', type: ChannelType.GuildVoice }
                            ],
                            '🛠️ SUPPORT': [
                                { name: '🎫-tickets', type: ChannelType.GuildText },
                                { name: '📝-bewerbung', type: ChannelType.GuildText },
                                { name: '❓-hilfe', type: ChannelType.GuildText }
                            ],
                            '📊 LOGS': [
                                { name: '📋-mod-logs', type: ChannelType.GuildText },
                                { name: '👥-member-logs', type: ChannelType.GuildText },
                                { name: '💬-message-logs', type: ChannelType.GuildText },
                                { name: '🎫-ticket-logs', type: ChannelType.GuildText }
                            ],
                            '🎭 ROLLEN': [
                                { name: '🎭-rollen-info', type: ChannelType.GuildText }
                            ],
                            '🏗️ CLAN': [
                                { name: '🏗️-clan-info', type: ChannelType.GuildText },
                                { name: '📋-clan-bewerbung', type: ChannelType.GuildText }
                            ]
                        };
                        
                        const createdChannels = {};
                        for (const [catName, chans] of Object.entries(channelsToCreate)) {
                            const category = createdCategories[catName];
                            if (category) {
                                for (const chan of chans) {
                                    let channel = interaction.guild.channels.cache.find(c => c.name === chan.name && c.parentId === category.id);
                                    if (!channel) {
                                        try {
                                            channel = await interaction.guild.channels.create({
                                                name: chan.name,
                                                type: chan.type,
                                                parent: category,
                                                reason: 'Server Setup'
                                            });
                                            console.log(`✅ Channel erstellt: ${chan.name}`);
                                        } catch (error) {
                                            console.error(`❌ Fehler beim Erstellen des Channels ${chan.name}:`, error);
                                        }
                                    }
                                    if (channel) createdChannels[chan.name] = channel;
                                }
                            }
                        }
                        
                        // ===== CHANNEL CONFIG SETZEN =====
                        console.log('🔄 Konfiguriere Channel-IDs...');
                        if (!channelConfig[interaction.guild.id]) channelConfig[interaction.guild.id] = {};
                        
                        // Finde die richtigen Channels für die Config
                        const verifyChannel = Object.values(createdChannels).find(c => c.name.includes('verify'));
                        const bewerbungChannel = Object.values(createdChannels).find(c => c.name.includes('bewerbung'));
                        const ticketsChannel = Object.values(createdChannels).find(c => c.name.includes('tickets'));
                        const logsChannel = Object.values(createdChannels).find(c => c.name.includes('mod-logs'));
                        const rollInfoChannel = Object.values(createdChannels).find(c => c.name.includes('rollen-info'));
                        
                        if (verifyChannel) channelConfig[interaction.guild.id]['verify'] = verifyChannel.id;
                        if (bewerbungChannel) channelConfig[interaction.guild.id]['bewerbung'] = bewerbungChannel.id;
                        if (ticketsChannel) channelConfig[interaction.guild.id]['tickets'] = ticketsChannel.id;
                        if (logsChannel) channelConfig[interaction.guild.id]['logs'] = logsChannel.id;

                        
                        saveData();
                        
                        // ===== BERECHTIGUNGEN SETZEN =====
                        console.log('🔄 Setze Berechtigungen...');
                        for (const channel of Object.values(createdChannels)) {
                            try {
                                const permissionOverwrites = [
                                    {
                                        id: interaction.guild.id,
                                        deny: [PermissionFlagsBits.ViewChannel]
                                    }
                                ];
                                
                                // Unverified Rolle - sieht nur willkommen und verify
                                if (createdRoles['🔒 Unverified']) {
                                    permissionOverwrites.push({
                                        id: createdRoles['🔒 Unverified'].id,
                                        allow: channel.name.includes('willkommen') || channel.name.includes('verify') ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] : [],
                                        deny: !channel.name.includes('willkommen') && !channel.name.includes('verify') ? [PermissionFlagsBits.ViewChannel] : []
                                    });
                                }
                                
                                // Verified-Rolle - sieht alles außer Admin-Channels
                                if (createdRoles['✅ Verified']) {
                                    const isAdminChannel = channel.name.includes('mod-logs') || channel.name.includes('member-logs') || channel.name.includes('message-logs');
                                    permissionOverwrites.push({
                                        id: createdRoles['✅ Verified'].id,
                                        allow: !isAdminChannel ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] : [],
                                        deny: isAdminChannel ? [PermissionFlagsBits.ViewChannel] : []
                                    });
                                }
                                
                                // Support Rolle - sieht Support und Community
                                if (createdRoles['🎧〢IG | Supporter']) {
                                    const isSupportChannel = channel.name.includes('tickets') || channel.name.includes('bewerbung') || channel.name.includes('hilfe');
                                    const isCommunityChannel = channel.name.includes('chat') || channel.name.includes('gaming') || channel.name.includes('musik');
                                    permissionOverwrites.push({
                                        id: createdRoles['🎧〢IG | Supporter'].id,
                                        allow: isSupportChannel || isCommunityChannel ? [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] : [],
                                        deny: !isSupportChannel && !isCommunityChannel ? [PermissionFlagsBits.ViewChannel] : []
                                    });
                                }
                                
                                // Admin Rolle - sieht alles
                                if (createdRoles['🛡️ Admin']) {
                                    permissionOverwrites.push({
                                        id: createdRoles['🛡️ Admin'].id,
                                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.Administrator]
                                    });
                                }
                                
                                await channel.permissionOverwrites.set(permissionOverwrites);
                            } catch (error) {
                                console.error(`❌ Fehler beim Setzen der Berechtigungen für Channel ${channel.name}:`, error);
                            }
                        }
                        
                        // ===== SETUP-NACHRICHTEN ERSTELLEN =====
                        console.log('🔄 Erstelle Setup-Nachrichten...');
                        
                        // Willkommens-Nachricht
                        const welcomeChannel = Object.values(createdChannels).find(c => c.name.includes('willkommen'));
                        if (welcomeChannel) {
                            const welcomeEmbed = new EmbedBuilder()
                                .setColor(SOGConfig.SUCCESS_COLOR)
                                .setTitle('🎉 Willkommen bei SOG!')
                                .setDescription(`**Hallo!** 👋\n\nWillkommen auf dem **${SOGConfig.BRAND_NAME}**!\n\n**🎯 Was erwartet dich:**\n• 🏗️ **Clan-System** mit eigenen Plots\n• 🎮 **Minecraft Server** mit Mods\n• 👥 **Aktive Community**\n• 🛡️ **Fair Play** & Anti-Griefing\n\n**📋 Nächste Schritte:**\n1️⃣ Akzeptiere das Regelwerk\n2️⃣ Bewerbe dich für einen Clan\n3️⃣ Erstelle ein Ticket bei Fragen`)
                                .addFields(
                                    { name: '🎮 Java Server', value: `\`${SOGConfig.getServerInfo().java}\``, inline: true },
                                    { name: '📱 Bedrock Server', value: `\`${SOGConfig.getServerInfo().bedrock}\``, inline: true }
                                )
                                .setFooter({ text: `${SOGConfig.BRAND_NAME} • Willkommen im Team!`, iconURL: SOGConfig.LOGO_URL })
                                .setTimestamp();
                            
                            const ruleButton = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('accept_rules')
                                        .setLabel('✅ Regelwerk akzeptieren')
                                        .setStyle(ButtonStyle.Success)
                                        .setEmoji('📋'),
                                    new ButtonBuilder()
                                        .setCustomId('apply_clan')
                                        .setLabel('📝 Clan bewerben')
                                        .setStyle(ButtonStyle.Primary)
                                        .setEmoji('🏗️')
                                );
                            
                            await welcomeChannel.send({ embeds: [welcomeEmbed], components: [ruleButton] });
                        }
                        
                        // Bewerbungs-Nachricht
                        const bewerbungChannelMsg = Object.values(createdChannels).find(c => c.name.includes('bewerbung'));
                        if (bewerbungChannelMsg) {
                            const bewerbungEmbed = new EmbedBuilder()
                                .setColor(SOGConfig.BRAND_COLOR)
                                .setTitle('🏗️ SOG Shadow-of-Gods Clan Bewerbung')
                                .setDescription(`**Du suchst einen frischen Clan auf OPSUCHT?**\nTrete noch heute dem **SOG Shadow-of-Gods Clan** bei.\n\n**🔎 Wen wir suchen:**\n• 👨‍🌾 **Aktive Farmer** die für uns Rohstoffe Farmen\n• 🧱 **Builder** die gut bauen können und Spaß am Bauen haben\n\n**✅ Das solltest du mitbringen:**\n• Discord Zugang\n• Lust und Laune\n\n**🏁 Unsere Ziele:**\n• Clan Verifizierung und Aktive Spieler\n• Neue Clan Plots und Shops\n\n**👑 Direkte Ansprechpartner:**\n• **Clan owner:** @Hechti10 👑\n• **Stv-owner:** @Zoxxer_11 👑\n• **Team-Leitung:** @philly5769\n• **Admin:** @NetherKnight943\n\n**📝 Trete noch heute bei** in dem du @NetherKnight943, @philly5769, @Zoxxer_11 oder dem lieben @Hechti10 eine DM schreibst.`)
                                .addFields(
                                    { name: '🎯 Clan Name', value: 'SOG Shadow-of-Gods', inline: true },
                                    { name: '👥 Mitglieder', value: 'Aktive Community', inline: true },
                                    { name: '🏗️ Plots', value: 'Eigene Clan Plots', inline: true }
                                )
                                .setFooter({ text: `${SOGConfig.BOT_NAME} • Clan Bewerbung`, iconURL: SOGConfig.LOGO_URL })
                                .setTimestamp();
                            
                            const bewerbungButton = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('start_bewerbung')
                                        .setLabel('📝 Bewerbung starten')
                                        .setStyle(ButtonStyle.Primary)
                                        .setEmoji('📝')
                                );
                            
                            await bewerbungChannel.send({ embeds: [bewerbungEmbed], components: [bewerbungButton] });
                        }
                        
                        // Ticket-System
                        const ticketsChannelMsg = Object.values(createdChannels).find(c => c.name.includes('tickets'));
                        if (ticketsChannelMsg) {
                            const ticketEmbed = new EmbedBuilder()
                                .setColor('#0099ff')
                                .setTitle('🎫 Ticket System')
                                .setDescription('**Willkommen beim SOG Support System!**\n\n**📋 Wie es funktioniert:**\n• Klicke auf den Button unten\n• Ein privater Channel wird erstellt\n• Support wird sich bei dir melden\n\n**🎯 Wofür Tickets:**\n• 🆘 **Technische Probleme**\n• 💰 **Spenden & Premium**\n• 🏗️ **Clan Bewerbungen**\n• 🛡️ **Reports & Appeals**\n• ❓ **Allgemeine Fragen**')
                                .addFields(
                                    { name: '⏰ Antwortzeit', value: 'Normalerweise < 24h', inline: true },
                                    { name: '👥 Support Team', value: 'Admins & Moderatoren', inline: true },
                                    { name: '📝 Hinweis', value: 'Sei geduldig und höflich', inline: true }
                                )
                                .setFooter({ text: 'SOG Admin Bot • Ticket System', iconURL: interaction.guild.iconURL() })
                                .setTimestamp();
                            
                            const ticketButton = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setCustomId('create_ticket')
                                        .setLabel('🎫 Ticket erstellen')
                                        .setStyle(ButtonStyle.Primary)
                                        .setEmoji('🎫')
                                );
                            
                            await ticketsChannel.send({ embeds: [ticketEmbed], components: [ticketButton] });
                        }
                        
                        // Rollen-Info System
                        const rollInfoChannelMsg = Object.values(createdChannels).find(c => c.name.includes('rollen-info'));
                        if (rollInfoChannelMsg) {
                            const rollInfoEmbed = new EmbedBuilder()
                                .setColor('#00ff88')
                                .setTitle('🎭 Rollen-Informationen')
                                .setDescription('**Wähle eine Rolle aus dem Menü unten aus, um Informationen zu erhalten:**\n\n**📋 Verfügbare Rollen:**\n• Alle Server-Rollen werden hier angezeigt\n• Klicke auf eine Rolle für Details\n• Sieh Mitglieder und Beschreibung')
                                .addFields(
                                    { name: '🎯 Funktion', value: 'Rollen-Info System', inline: true },
                                    { name: '📊 Verfügbare Rollen', value: `${interaction.guild.roles.cache.size - 1} Rollen`, inline: true }
                                )
                                .setFooter({ text: 'SOG Admin Bot • Rollen-Info', iconURL: interaction.guild.iconURL() })
                                .setTimestamp();
                            
                            await rollInfoChannel.send({ embeds: [rollInfoEmbed] });
                        }
                        
                        // Regeln-Channel automatisch befüllen
                        const regelnChannel = Object.values(createdChannels).find(c => c.name.includes('regeln'));
                        if (regelnChannel) {
                            const regelnEmbed = new EmbedBuilder()
                                .setColor(SOGConfig.BRAND_COLOR)
                                .setTitle('📋 SOG Server Regeln')
                                .setDescription(`
**📎 Allgemeines**
Mit der Nutzung des Servers akzeptierst du die Nutzungsbedingungen von Discord sowie die Ingame Guidelines.

**💡 Verhalten im Chat & Voice**
• Freundlichkeit ist Pflicht – kein Mobbing, keine Beleidigungen
• Kein Spam, keine unangemessene Sprache, kein Trollen
• @everyone und @here dürfen nur von autorisierten Personen verwendet werden

**🧱 CLAN-PLOT-REGELN**
• Griefing und mutwillige Zerstörung sind strengstens verboten
• Beleidigende oder unangemessene Bauwerke sind nicht erlaubt
• Öffentliche Farmen sind für alle da

**🎮 MINECRAFT SERVER REGELN**
• Kein Griefing oder Stehlen von anderen Spielern
• Keine unangemessenen Bauwerke oder Namen
• Respektiere die Arbeit anderer Spieler
• Keine Hacks, Cheats oder Mods die andere benachteiligen

**🛡️ MODERATION**
• Admins und Moderatoren haben das letzte Wort
• Verstöße führen zu Warns, Kicks oder Bans
• Bei Fragen erstelle ein Ticket

**📅 Stand: Juli 2025**
                                `)
                                .addFields(
                                    { name: '⚠️ Wichtig', value: 'Verstöße führen zu Warns, Kicks oder Bans', inline: true },
                                    { name: '🛡️ Fair Play', value: 'Respektiere alle Spieler', inline: true },
                                    { name: '📞 Support', value: 'Bei Fragen erstelle ein Ticket', inline: true }
                                )
                                .setFooter({ text: `${SOGConfig.BOT_NAME} • Server Regeln`, iconURL: SOGConfig.LOGO_URL })
                                .setTimestamp();
                            
                            await regelnChannel.send({ embeds: [regelnEmbed] });
                        }
                        
                        // ===== ERGEBNIS-EMBED =====
                        const successEmbed = new EmbedBuilder()
                            .setColor(SOGConfig.SUCCESS_COLOR)
                            .setTitle('✅ SOG Server Setup abgeschlossen!')
                            .setDescription('**Der Server wurde erfolgreich vollständig eingerichtet!** 🎉\n\n**🚀 Alle Systeme sind einsatzbereit:**\n• ✅ **Ticket-System** mit Support-Rolle\n• ✅ **Verify-System** mit Unverified-Rolle\n• ✅ **Bewerbungs-System** mit Modal\n• ✅ **Rollen-Info System**\n• ✅ **Logging-System**\n• ✅ **Berechtigungen** korrekt gesetzt')
                            .addFields(
                                { name: '👥 Erstellte Rollen', value: `${Object.keys(createdRoles).length} Rollen`, inline: true },
                                { name: '📺 Erstellte Channels', value: `${Object.keys(createdChannels).length} Channels`, inline: true },
                                { name: '📁 Erstellte Kategorien', value: `${Object.keys(createdCategories).length} Kategorien`, inline: true },
                                { name: '🎯 Nächste Schritte', value: '• Bot-Rolle nach oben verschieben\n• Support-Rolle vergeben\n• Teste alle Systeme', inline: false }
                            )
                            .setFooter({ text: `${SOGConfig.BOT_NAME} • Server Setup`, iconURL: SOGConfig.LOGO_URL })
                            .setTimestamp();
                        
                        await interaction.followUp({ embeds: [successEmbed] });
                        console.log('✅ Server Setup erfolgreich abgeschlossen!');
                        
                    } catch (error) {
                        console.error('❌ Fehler beim Server Setup:', error);
                        const errorEmbed = new EmbedBuilder()
                            .setColor(SOGConfig.ERROR_COLOR)
                            .setTitle('❌ Fehler beim Setup')
                            .setDescription('Es gab einen Fehler beim Einrichten des Servers.')
                            .addFields(
                                { name: '🔧 Fehler', value: error.message, inline: false }
                            )
                            .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                            .setTimestamp();
                        await interaction.followUp({ embeds: [errorEmbed] });
                    }
                } else {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Fehler')
                        .setDescription('Bestätigungscode falsch oder nicht eingegeben')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    await interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                // Admin-Rolle sicherstellen
                await addAdminRoleIfMissing(interaction.guild);
                break;

            case 'setupunverified':
                if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Keine Berechtigung')
                        .setDescription('Nur Administratoren können diesen Befehl nutzen!')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    return interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                
                const confirmUnverified = interaction.options.getString('confirm');
                
                if (confirmUnverified === 'UNVERIFIED') {
                    const setupEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.WARNING_COLOR)
                        .setTitle('🔒 Unverified-System Setup läuft...')
                        .setDescription('Das Unverified-System wird eingerichtet. Neue Mitglieder sehen nur Welcome und Unverified Channels.')
                        .addFields(
                            { name: '📋 Was wird eingerichtet:', value: '• Unverified-Rolle\n• Welcome Channel\n• Unverified Channel\n• Channel-Berechtigungen\n• Automatische Zuweisung', inline: false }
                        )
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [setupEmbed] });
                    
                    try {
                        // Erstelle Unverified Channels
                        await createUnverifiedChannels(interaction.guild);
                        
                        // Setze Channel-Berechtigungen
                        await setupUnverifiedPermissions(interaction.guild);
                        
                        // Weise allen bestehenden Usern die Unverified-Rolle zu
                        const result = await assignUnverifiedToAllUsers(interaction.guild);
                        
                        const successEmbed = new EmbedBuilder()
                            .setColor(SOGConfig.SUCCESS_COLOR)
                            .setTitle('✅ Unverified-System Setup abgeschlossen!')
                            .setDescription('**Das Unverified-System wurde erfolgreich eingerichtet!** 🔒\n\n**🚀 System ist einsatzbereit:**\n• ✅ **Unverified-Rolle** erstellt\n• ✅ **Welcome Channel** eingerichtet\n• ✅ **Unverified Channel** eingerichtet\n• ✅ **Channel-Berechtigungen** gesetzt\n• ✅ **Automatische Zuweisung** für neue Mitglieder')
                            .addFields(
                                { name: '👥 Rollen zugewiesen', value: `${result.assignedCount} User`, inline: true },
                                { name: '❌ Fehlgeschlagen', value: `${result.failedCount} User`, inline: true },
                                { name: '⏭️ Übersprungen', value: `${result.skippedCount} User`, inline: true },
                                { name: '🎯 Nächste Schritte', value: '• Teste mit einem neuen Account\n• Verifiziere User manuell\n• Überprüfe Channel-Berechtigungen', inline: false }
                            )
                            .setFooter({ text: `${SOGConfig.BOT_NAME} • Unverified Setup`, iconURL: SOGConfig.LOGO_URL })
                            .setTimestamp();
                        
                        await interaction.followUp({ embeds: [successEmbed] });
                        console.log('✅ Unverified-System Setup erfolgreich abgeschlossen!');
                        
                    } catch (error) {
                        console.error('❌ Fehler beim Unverified-System Setup:', error);
                        const errorEmbed = new EmbedBuilder()
                            .setColor(SOGConfig.ERROR_COLOR)
                            .setTitle('❌ Fehler beim Setup')
                            .setDescription('Es gab einen Fehler beim Einrichten des Unverified-Systems.')
                            .addFields(
                                { name: '🔧 Fehler', value: error.message, inline: false }
                            )
                            .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                            .setTimestamp();
                        await interaction.followUp({ embeds: [errorEmbed] });
                    }
                } else {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Fehler')
                        .setDescription('Bestätigungscode falsch oder nicht eingegeben')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    await interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                break;

            case 'roll':
                const rollUser = interaction.options.getUser('username');
                const rollMember = await interaction.guild.members.fetch(rollUser.id);
                
                const userRoles = rollMember.roles.cache
                    .filter(role => role.name !== '@everyone')
                    .sort((a, b) => b.position - a.position);
                
                if (userRoles.size === 0) {
                    const noRolesEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.WARNING_COLOR)
                        .setTitle('📋 Keine Rollen')
                        .setDescription(`${rollUser.username} hat keine Rollen.`)
                        .addFields(
                            { name: '👤 User', value: rollUser.username, inline: true },
                            { name: '🆔 User ID', value: `\`${rollUser.id}\``, inline: true }
                        )
                        .setFooter({ text: 'SOG Admin Bot • Rollen-Info', iconURL: interaction.guild.iconURL() })
                        .setTimestamp();
                    return interaction.reply({ embeds: [noRolesEmbed], flags: 64 });
                }
                
                const roleList = userRoles.map(role => 
                    `**${role.name}** \n└ Farbe: \`${role.hexColor}\` | Mitglieder: \`${role.members.size}\` | Position: \`${role.position}\``
                ).join('\n\n');
                
                const rolesEmbed = new EmbedBuilder()
                    .setColor(SOGConfig.BRAND_COLOR)
                    .setTitle(`📋 Rollen von ${rollUser.username}`)
                    .setDescription(roleList)
                    .addFields(
                        { name: '📊 Gesamt', value: `${userRoles.size} Rolle(n)`, inline: true },
                        { name: '👤 User', value: rollUser.username, inline: true },
                        { name: '🆔 User ID', value: `\`${rollUser.id}\``, inline: true }
                    )
                    .setFooter({ text: 'SOG Admin Bot • Rollen-Info', iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [rolesEmbed], flags: 64 });
                break;

            case 'rolemanage':
                if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Keine Berechtigung')
                        .setDescription('Du hast keine Berechtigung für diesen Befehl!')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    return interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                
                const roleManageUser = interaction.options.getUser('username');
                const action = interaction.options.getString('action');
                const roleManageName = interaction.options.getString('rolename');
                const permissions = interaction.options.getString('permissions');
                
                try {
                    const roleManageMember = await interaction.guild.members.fetch(roleManageUser.id);
                    
                    if (action === 'create') {
                        // Parse permissions
                        let rolePermissions = [];
                        if (permissions) {
                            const permList = permissions.split(',').map(p => p.trim());
                            rolePermissions = permList.map(perm => {
                                switch (perm.toLowerCase()) {
                                    case 'send_messages': return PermissionFlagsBits.SendMessages;
                                    case 'read_messages': return PermissionFlagsBits.ReadMessageHistory;
                                    case 'manage_messages': return PermissionFlagsBits.ManageMessages;
                                    case 'kick_members': return PermissionFlagsBits.KickMembers;
                                    case 'ban_members': return PermissionFlagsBits.BanMembers;
                                    case 'administrator': return PermissionFlagsBits.Administrator;
                                    case 'manage_roles': return PermissionFlagsBits.ManageRoles;
                                    case 'manage_channels': return PermissionFlagsBits.ManageChannels;
                                    case 'view_channel': return PermissionFlagsBits.ViewChannel;
                                    default: return null;
                                }
                            }).filter(p => p !== null);
                        }
                        
                        // Create role
                        const newRole = await interaction.guild.roles.create({
                            name: roleManageName,
                            color: '#00ff88',
                            permissions: rolePermissions,
                            reason: `Rolle erstellt von ${interaction.user.username}`
                        });
                        
                        // Assign role
                        await roleManageMember.roles.add(newRole);
                        
                        const successEmbed = new EmbedBuilder()
                            .setColor(SOGConfig.SUCCESS_COLOR)
                            .setTitle('✅ Rolle erstellt und zugewiesen')
                            .setDescription(`**Rolle:** ${newRole.name}\n**User:** ${roleManageUser.username}\n**Moderator:** ${interaction.user.username}`)
                            .addFields(
                                { name: '🎨 Farbe', value: `\`${newRole.hexColor}\``, inline: true },
                                { name: '🆔 Rollen ID', value: `\`${newRole.id}\``, inline: true },
                                { name: '🔐 Berechtigungen', value: permissions || 'Keine speziellen', inline: true }
                            )
                            .setFooter({ text: 'SOG Admin Bot • Rollen-Management', iconURL: interaction.guild.iconURL() })
                            .setTimestamp();
                        
                        await interaction.reply({ embeds: [successEmbed] });
                        
                    } else if (action === 'add') {
                        // Find existing role
                        const existingRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === roleManageName.toLowerCase());
                        
                        if (!existingRole) {
                            const errorEmbed = new EmbedBuilder()
                                .setColor(SOGConfig.ERROR_COLOR)
                                .setTitle('❌ Rolle nicht gefunden')
                                .setDescription(`Die Rolle **${roleManageName}** wurde nicht gefunden!`)
                                .setFooter({ text: 'SOG Admin Bot • Rollen-Management', iconURL: interaction.guild.iconURL() })
                                .setTimestamp();
                            return interaction.reply({ embeds: [errorEmbed], flags: 64 });
                        }
                        
                        // Add role
                        await roleManageMember.roles.add(existingRole);
                        
                        const successEmbed = new EmbedBuilder()
                            .setColor(SOGConfig.SUCCESS_COLOR)
                            .setTitle('✅ Rolle zugewiesen')
                            .setDescription(`**Rolle:** ${existingRole.name}\n**User:** ${roleManageUser.username}\n**Moderator:** ${interaction.user.username}`)
                            .addFields(
                                { name: '🎨 Farbe', value: `\`${existingRole.hexColor}\``, inline: true },
                                { name: '🆔 Rollen ID', value: `\`${existingRole.id}\``, inline: true }
                            )
                            .setFooter({ text: 'SOG Admin Bot • Rollen-Management', iconURL: interaction.guild.iconURL() })
                            .setTimestamp();
                        
                        await interaction.reply({ embeds: [successEmbed] });
                        
                    } else if (action === 'remove') {
                        // Find existing role
                        const existingRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === roleManageName.toLowerCase());
                        
                        if (!existingRole) {
                            const errorEmbed = new EmbedBuilder()
                                .setColor(SOGConfig.ERROR_COLOR)
                                .setTitle('❌ Rolle nicht gefunden')
                                .setDescription(`Die Rolle **${roleManageName}** wurde nicht gefunden!`)
                                .setFooter({ text: 'SOG Admin Bot • Rollen-Management', iconURL: interaction.guild.iconURL() })
                                .setTimestamp();
                            return interaction.reply({ embeds: [errorEmbed], flags: 64 });
                        }
                        
                        // Remove role
                        await roleManageMember.roles.remove(existingRole);
                        
                        const successEmbed = new EmbedBuilder()
                            .setColor(SOGConfig.SUCCESS_COLOR)
                            .setTitle('✅ Rolle entfernt')
                            .setDescription(`**Rolle:** ${existingRole.name}\n**User:** ${roleManageUser.username}\n**Moderator:** ${interaction.user.username}`)
                            .addFields(
                                { name: '🎨 Farbe', value: `\`${existingRole.hexColor}\``, inline: true },
                                { name: '🆔 Rollen ID', value: `\`${existingRole.id}\``, inline: true }
                            )
                            .setFooter({ text: 'SOG Admin Bot • Rollen-Management', iconURL: interaction.guild.iconURL() })
                            .setTimestamp();
                        
                        await interaction.reply({ embeds: [successEmbed] });
                    }
                    
                } catch (error) {
                    console.error('❌ Fehler beim Rollen-Management:', error);
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Fehler')
                        .setDescription('Fehler beim Rollen-Management!')
                        .addFields(
                            { name: '🔧 Fehler', value: error.message, inline: false }
                        )
                        .setFooter({ text: 'SOG Admin Bot • Rollen-Management', iconURL: interaction.guild.iconURL() })
                        .setTimestamp();
                    await interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                break;

            case 'assignunverified':
                if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Keine Berechtigung')
                        .setDescription('Nur Administratoren können diesen Befehl nutzen!')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    return interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                
                const confirmAssign = interaction.options.getString('confirm');
                
                if (confirmAssign === 'ASSIGN') {
                    const assignEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.WARNING_COLOR)
                        .setTitle('🔄 Unverified-Rollen werden zugewiesen...')
                        .setDescription('Allen Usern ohne Rollen wird die Unverified-Rolle zugewiesen.')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [assignEmbed] });
                    
                    try {
                        const result = await assignUnverifiedToAllUsers(interaction.guild);
                        
                        const resultEmbed = new EmbedBuilder()
                            .setColor(SOGConfig.SUCCESS_COLOR)
                            .setTitle('✅ Unverified-Rollen zugewiesen!')
                            .setDescription(`**Erfolgreich zugewiesen:** ${result.assignedCount} User\n**Fehlgeschlagen:** ${result.failedCount} User\n**Übersprungen:** ${result.skippedCount} User`)
                            .addFields(
                                { name: '✅ Erfolgreich', value: `${result.assignedCount} User`, inline: true },
                                { name: '❌ Fehlgeschlagen', value: `${result.failedCount} User`, inline: true },
                                { name: '⏭️ Übersprungen', value: `${result.skippedCount} User`, inline: true }
                            )
                            .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                            .setTimestamp();
                        
                        await interaction.followUp({ embeds: [resultEmbed] });
                        console.log(`✅ Unverified-Rollen zugewiesen: ${result.assignedCount} erfolgreich, ${result.failedCount} fehlgeschlagen, ${result.skippedCount} übersprungen`);
                        
                    } catch (error) {
                        console.error('❌ Fehler beim Zuweisen der Unverified-Rollen:', error);
                        const errorEmbed = new EmbedBuilder()
                            .setColor(SOGConfig.ERROR_COLOR)
                            .setTitle('❌ Fehler')
                            .setDescription('Fehler beim Zuweisen der Unverified-Rollen.')
                            .addFields(
                                { name: '🔧 Fehler', value: error.message, inline: false }
                            )
                            .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                            .setTimestamp();
                        await interaction.followUp({ embeds: [errorEmbed] });
                    }
                } else {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Fehler')
                        .setDescription('Bestätigungscode falsch oder nicht eingegeben')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    await interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                break;

            case 'assignunverifiedall':
                if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Keine Berechtigung')
                        .setDescription('Nur Administratoren können diesen Befehl nutzen!')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    return interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                
                const confirmAssignAll = interaction.options.getString('confirm');
                
                if (confirmAssignAll === 'ASSIGNALL') {
                    const assignAllEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.WARNING_COLOR)
                        .setTitle('🔄 Unverified-Rollen werden ALLEN Usern zugewiesen...')
                        .setDescription('⚠️ **ACHTUNG:** Auch Admins bekommen die Unverified-Rolle!')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [assignAllEmbed] });
                    
                    try {
                        // Suche nach Unverified Rolle
                        let unverifiedRole = interaction.guild.roles.cache.find(role => 
                            role.name.toLowerCase().includes('unverified') ||
                            role.name.toLowerCase().includes('nicht verifiziert') ||
                            role.name.toLowerCase().includes('unbestätigt')
                        );
                        
                        // Erstelle Unverified Rolle falls nicht vorhanden
                        if (!unverifiedRole) {
                            unverifiedRole = await interaction.guild.roles.create({
                                name: '🔒 Unverified',
                                color: '#808080',
                                reason: 'Automatische Erstellung für alle User',
                                permissions: []
                            });
                            console.log('✅ Unverified-Rolle erstellt');
                        }
                        
                        let assignedCount = 0;
                        let failedCount = 0;
                        let skippedCount = 0;
                        
                        // Gehe durch alle Mitglieder
                        for (const member of interaction.guild.members.cache.values()) {
                            // Überspringe Bots
                            if (member.user.bot) {
                                skippedCount++;
                                continue;
                            }
                            
                            // Prüfe ob User bereits die Unverified-Rolle hat
                            if (member.roles.cache.has(unverifiedRole.id)) {
                                skippedCount++;
                                continue;
                            }
                            
                            // Weise ALLEN Usern die Unverified-Rolle zu (auch Admins)
                            try {
                                await member.roles.add(unverifiedRole);
                                assignedCount++;
                                console.log(`✅ Unverified-Rolle zugewiesen an ${member.user.username}`);
                            } catch (error) {
                                failedCount++;
                                console.error(`❌ Fehler beim Zuweisen der Unverified-Rolle an ${member.user.username}:`, error);
                            }
                        }
                        
                        const resultAllEmbed = new EmbedBuilder()
                            .setColor(SOGConfig.SUCCESS_COLOR)
                            .setTitle('✅ Unverified-Rollen ALLEN Usern zugewiesen!')
                            .setDescription(`**Erfolgreich zugewiesen:** ${assignedCount} User\n**Fehlgeschlagen:** ${failedCount} User\n**Übersprungen:** ${skippedCount} User`)
                            .addFields(
                                { name: '✅ Erfolgreich', value: `${assignedCount} User`, inline: true },
                                { name: '❌ Fehlgeschlagen', value: `${failedCount} User`, inline: true },
                                { name: '⏭️ Übersprungen', value: `${skippedCount} User`, inline: true },
                                { name: '⚠️ Hinweis', value: 'Auch Admins haben jetzt die Unverified-Rolle!', inline: false }
                            )
                            .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                            .setTimestamp();
                        
                        await interaction.followUp({ embeds: [resultAllEmbed] });
                        console.log(`✅ Unverified-Rollen ALLEN Usern zugewiesen: ${assignedCount} erfolgreich, ${failedCount} fehlgeschlagen, ${skippedCount} übersprungen`);
                        
                    } catch (error) {
                        console.error('❌ Fehler beim Zuweisen der Unverified-Rollen an alle User:', error);
                        const errorEmbed = new EmbedBuilder()
                            .setColor(SOGConfig.ERROR_COLOR)
                            .setTitle('❌ Fehler')
                            .setDescription('Fehler beim Zuweisen der Unverified-Rollen an alle User.')
                            .addFields(
                                { name: '🔧 Fehler', value: error.message, inline: false }
                            )
                            .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                            .setTimestamp();
                        await interaction.followUp({ embeds: [errorEmbed] });
                    }
                } else {
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Fehler')
                        .setDescription('Bestätigungscode falsch oder nicht eingegeben')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    await interaction.reply({ embeds: [errorEmbed], flags: 64 });
                }
                break;
        }
    }

    // Roll-Info System
    if (interaction.isStringSelectMenu() && interaction.customId === 'role_select') {
        const selectedRoleId = interaction.values[0];
        const selectedRole = interaction.guild.roles.cache.get(selectedRoleId);
        
        if (selectedRole) {
            const roleEmbed = new EmbedBuilder()
                .setColor(selectedRole.hexColor)
                .setTitle(`🎭 ${selectedRole.name}`)
                .setDescription(`**Rollen-Informationen**`)
                .addFields(
                    { name: '🎨 Farbe', value: `\`${selectedRole.hexColor}\``, inline: true },
                    { name: '🆔 Rollen ID', value: `\`${selectedRole.id}\``, inline: true },
                    { name: '👥 Mitglieder', value: `${selectedRole.members.size}`, inline: true },
                    { name: '📅 Erstellt', value: `<t:${Math.floor(selectedRole.createdTimestamp / 1000)}:F>`, inline: true },
                    { name: '🔐 Position', value: `${selectedRole.position}`, inline: true },
                    { name: '💬 Erwähnbar', value: selectedRole.mentionable ? '✅' : '❌', inline: true }
                )
                .setFooter({ text: 'SOG Admin Bot • Rollen-Info', iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            
            await interaction.reply({ embeds: [roleEmbed], flags: 64 });
        }
    }

    // Regelwerk akzeptieren
    if (interaction.isButton() && interaction.customId === 'accept_rules') {
        // Zeige die Regeln als Embed mit direktem Akzeptieren-Button
        const rulesEmbed = new EmbedBuilder()
            .setColor(SOGConfig.BRAND_COLOR)
            .setTitle('📋 SOG Server Regeln')
            .setDescription(`
📎 **Allgemeines**
Mit der Nutzung des Servers akzeptierst du die Nutzungsbedingungen von Discord sowie die Ingame Guidelines.

💡 **Verhalten im Chat & Voice**
• Freundlichkeit ist Pflicht – kein Mobbing, keine Beleidigungen
• Kein Spam, keine unangemessene Sprache, kein Trollen
• @everyone und @here dürfen nur von autorisierten Personen verwendet werden

🧱 **CLAN-PLOT-REGELN**
• Griefing und mutwillige Zerstörung sind strengstens verboten
• Beleidigende oder unangemessene Bauwerke sind nicht erlaubt
• Öffentliche Farmen sind für alle da

🎮 **MINECRAFT SERVER REGELN**
• Kein Griefing oder Stehlen von anderen Spielern
• Keine unangemessenen Bauwerke oder Namen
• Respektiere die Arbeit anderer Spieler
• Keine Hacks, Cheats oder Mods die andere benachteiligen

🛡️ **MODERATION**
• Admins und Moderatoren haben das letzte Wort
• Verstöße führen zu Warns, Kicks oder Bans
• Bei Fragen erstelle ein Ticket

📅 Stand: Juli 2025
        `)
            .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
            .setTimestamp();

        const acceptButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('accept_rules_confirm')
                    .setLabel('✅ Regelwerk akzeptieren')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📋')
            );

        await interaction.reply({ embeds: [rulesEmbed], components: [acceptButton], ephemeral: true });
    }

    // Regelwerk bestätigen Button
    if (interaction.isButton() && interaction.customId === 'accept_rules_confirm') {
        // Sofort antworten, damit Interaction nicht abläuft!
        await interaction.deferReply({ ephemeral: true });
        
        try {
            const member = interaction.member;
            
            // Entferne Unverified Rolle
            const unverifiedRole = interaction.guild.roles.cache.find(role => 
                role.name.toLowerCase().includes('unverified') ||
                role.name.toLowerCase().includes('nicht verifiziert') ||
                role.name.toLowerCase().includes('unbestätigt')
            );
            
            if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
                try {
                    await member.roles.remove(unverifiedRole);
                    console.log(`✅ Unverified Rolle entfernt von ${member.user.username}`);
                } catch (error) {
                    console.error('❌ Fehler beim Entfernen der Unverified Rolle:', error);
                }
            }
            
            // Suche NUR nach der Verified-Rolle
            let verifiedRole = interaction.guild.roles.cache.find(role => 
                role.name.includes('✅ Verified')
            );
            
            // Falls keine Verified-Rolle gefunden, erstelle sie
            if (!verifiedRole) {
                try {
                    verifiedRole = await interaction.guild.roles.create({
                        name: '✅ Verified',
                        color: '#00ff88',
                        reason: 'Automatische Erstellung für verifizierte User',
                        permissions: []
                    });
                    console.log('✅ Verified-Rolle erstellt für verifizierte User');
                } catch (error) {
                    console.error('❌ Fehler beim Erstellen der Verified-Rolle:', error);
                }
            }
            
            if (verifiedRole) {
                try {
                    await member.roles.add(verifiedRole);
                } catch (error) {
                    console.error('❌ Fehler beim Hinzufügen der Verified Rolle:', error);
                    const errorEmbed = new EmbedBuilder()
                        .setColor(SOGConfig.ERROR_COLOR)
                        .setTitle('❌ Fehler')
                        .setDescription('Fehler beim Verifizieren. Kontaktiere einen Admin.')
                        .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                        .setTimestamp();
                    return await interaction.editReply({ embeds: [errorEmbed], flags: 64 });
                }
                
                // Setze Berechtigungen für alle Channels außer Verify-Channel
                try {
                    const verifyChannelId = channelConfig[interaction.guild.id]?.['verify'];
                    
                    // Gehe durch alle Channels und setze Berechtigungen
                    for (const channel of interaction.guild.channels.cache.values()) {
                        // Überspringe den Verify-Channel
                        if (verifyChannelId && channel.id === verifyChannelId) {
                            continue;
                        }
                        
                        try {
                            // Setze Berechtigungen für verifizierte User
                            await channel.permissionOverwrites.create(verifiedRole, {
                                ViewChannel: true,
                                SendMessages: true,
                                ReadMessageHistory: true,
                                UseExternalEmojis: true,
                                AddReactions: true
                            });
                        } catch (error) {
                            console.error(`❌ Fehler beim Setzen der Berechtigungen für Channel ${channel.name}:`, error);
                        }
                    }
                    
                    console.log(`✅ Channel-Berechtigungen gesetzt für ${member.user.username}`);
                } catch (error) {
                    console.error('❌ Fehler beim Setzen der Channel-Berechtigungen:', error);
                }
                
                const acceptEmbed = new EmbedBuilder()
                    .setColor(SOGConfig.SUCCESS_COLOR)
                    .setTitle('✅ Regelwerk akzeptiert!')
                    .setDescription('Du hast das Regelwerk erfolgreich akzeptiert!\n\n**🎯 Was passiert jetzt:**\n• Du kannst alle Kanäle sehen\n• Du kannst am Server teilnehmen\n• Du kannst dich für Clans bewerben')
                    .addFields(
                        { name: '🎭 Neue Rolle', value: verifiedRole.name, inline: true },
                        { name: '📅 Datum', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setFooter({ text: `${SOGConfig.BOT_NAME} • Willkommen!`, iconURL: SOGConfig.LOGO_URL })
                    .setTimestamp();
                await interaction.editReply({ embeds: [acceptEmbed], flags: 64 });
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setColor(SOGConfig.ERROR_COLOR)
                    .setTitle('❌ Fehler')
                    .setDescription('Verified-Rolle nicht gefunden. Kontaktiere einen Admin.')
                    .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                    .setTimestamp();
                await interaction.editReply({ embeds: [errorEmbed], flags: 64 });
            }
        } catch (error) {
            console.error('❌ Fehler beim Akzeptieren der Regeln:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(SOGConfig.ERROR_COLOR)
                .setTitle('❌ Fehler')
                .setDescription('Fehler beim Akzeptieren der Regeln. Kontaktiere einen Admin.')
                .addFields(
                    { name: '🔧 Fehler', value: error.message, inline: false }
                )
                .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                .setTimestamp();
            await interaction.editReply({ embeds: [errorEmbed], flags: 64 });
        }
    }

    // Clan Bewerbung Button
    if (interaction.isButton() && interaction.customId === 'apply_clan') {
        const modal = new ModalBuilder()
            .setCustomId('application_modal')
            .setTitle('🏗️ Clan Bewerbung');

        const nameInput = new TextInputBuilder()
            .setCustomId('clan_name')
            .setLabel('Clan Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('z.B. "Dragon Warriors"');

        const membersInput = new TextInputBuilder()
            .setCustomId('clan_members')
            .setLabel('Anzahl Clan Mitglieder')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('z.B. "5"');

        const reasonInput = new TextInputBuilder()
            .setCustomId('clan_reason')
            .setLabel('Warum solltet ihr aufgenommen werden?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('Beschreibe eure Motivation, Erfahrung und Pläne...');

        const experienceInput = new TextInputBuilder()
            .setCustomId('clan_experience')
            .setLabel('Minecraft Erfahrung (Jahre)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('z.B. "3"');

        const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
        const secondActionRow = new ActionRowBuilder().addComponents(membersInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(reasonInput);
        const fourthActionRow = new ActionRowBuilder().addComponents(experienceInput);

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);
        await interaction.showModal(modal);
    }

    // SOG Clan Bewerbung Button
    if (interaction.isButton() && interaction.customId === 'start_bewerbung') {
        const modal = new ModalBuilder()
            .setCustomId('sog_bewerbung_modal')
            .setTitle('🏗️ SOG Shadow-of-Gods Clan Bewerbung');

        const nameInput = new TextInputBuilder()
            .setCustomId('bewerber_name')
            .setLabel('Dein Name')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('z.B. "Max Mustermann"');

        const ageInput = new TextInputBuilder()
            .setCustomId('bewerber_age')
            .setLabel('Dein Alter')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('z.B. "18"');

        const experienceInput = new TextInputBuilder()
            .setCustomId('bewerber_experience')
            .setLabel('Minecraft Erfahrung (Jahre)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('z.B. "3"');

        const skillsInput = new TextInputBuilder()
            .setCustomId('bewerber_skills')
            .setLabel('Deine Fähigkeiten (Farmer/Builder/etc.)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('Beschreibe deine Stärken und was du beitragen kannst...');

        const motivationInput = new TextInputBuilder()
            .setCustomId('bewerber_motivation')
            .setLabel('Warum möchtest du dem SOG Clan beitreten?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setPlaceholder('Beschreibe deine Motivation und Ziele...');

        const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
        const secondActionRow = new ActionRowBuilder().addComponents(ageInput);
        const thirdActionRow = new ActionRowBuilder().addComponents(experienceInput);
        const fourthActionRow = new ActionRowBuilder().addComponents(skillsInput);
        const fifthActionRow = new ActionRowBuilder().addComponents(motivationInput);

        modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);
        await interaction.showModal(modal);
    }

    // Bewerbungsmodal verarbeiten
    if (interaction.isModalSubmit() && interaction.customId === 'application_modal') {
        const clanName = interaction.fields.getTextInputValue('clan_name');
        const clanMembers = interaction.fields.getTextInputValue('clan_members');
        const clanReason = interaction.fields.getTextInputValue('clan_reason');
        const clanExperience = interaction.fields.getTextInputValue('clan_experience');

        const applicationEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📝 Neue Clan Bewerbung')
            .setDescription(`**👤 Bewerber:** ${interaction.user.username}\n**🏗️ Clan Name:** ${clanName}\n**👥 Mitglieder:** ${clanMembers}\n**⏰ Erfahrung:** ${clanExperience} Jahre\n\n**📝 Begründung:**\n${clanReason}`)
            .addFields(
                { name: '🆔 User ID', value: `\`${interaction.user.id}\``, inline: true },
                { name: '📅 Bewerbungsdatum', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '👥 Mitglieder', value: clanMembers, inline: true }
            )
            .setFooter({ text: 'SOG Admin Bot • Clan Bewerbung', iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        const applicationChannel = interaction.guild.channels.cache.find(channel => 
            channel.name.toLowerCase().includes('bewerbung') ||
            channel.name.toLowerCase().includes('applications')
        );

        if (applicationChannel) {
            const acceptButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`accept_application_${interaction.user.id}`)
                        .setLabel('✅ Annehmen')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId(`deny_application_${interaction.user.id}`)
                        .setLabel('❌ Ablehnen')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

            await applicationChannel.send({ embeds: [applicationEmbed], components: [acceptButton] });
            
            const successEmbed = new EmbedBuilder()
                .setColor('#00ff88')
                .setTitle('✅ Bewerbung eingereicht!')
                .setDescription('Deine Clan Bewerbung wurde erfolgreich eingereicht!\n\n**📋 Nächste Schritte:**\n• Admins prüfen deine Bewerbung\n• Du wirst per DM benachrichtigt\n• Bei Fragen erstelle ein Ticket')
                .setFooter({ text: 'SOG Admin Bot • Clan Bewerbung', iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            await interaction.reply({ embeds: [successEmbed], flags: 64 });
        } else {
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff4444')
                .setTitle('❌ Fehler')
                .setDescription('Bewerbungskanal nicht gefunden. Kontaktiere einen Admin.')
                .setFooter({ text: 'SOG Admin Bot • Clan Bewerbung', iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    }

    // SOG Bewerbungsmodal verarbeiten
    if (interaction.isModalSubmit() && interaction.customId === 'sog_bewerbung_modal') {
        const bewerberName = interaction.fields.getTextInputValue('bewerber_name');
        const bewerberAge = interaction.fields.getTextInputValue('bewerber_age');
        const bewerberExperience = interaction.fields.getTextInputValue('bewerber_experience');
        const bewerberSkills = interaction.fields.getTextInputValue('bewerber_skills');
        const bewerberMotivation = interaction.fields.getTextInputValue('bewerber_motivation');

        // Erstelle Ticket für Support
        const ticketChannel = await interaction.guild.channels.create({
            name: `bewerbung-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                },
            ],
        });

        // Finde Support Rolle
        const supportRole = interaction.guild.roles.cache.find(role => 
            role.name.toLowerCase().includes('support') ||
            role.name.toLowerCase().includes('admin') ||
            role.name.toLowerCase().includes('moderator')
        );

        if (supportRole) {
            await ticketChannel.permissionOverwrites.create(supportRole, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
        }

        const bewerbungEmbed = new EmbedBuilder()
            .setColor(SOGConfig.BRAND_COLOR)
            .setTitle('📝 Neue SOG Clan Bewerbung')
            .setDescription(`**👤 Bewerber:** ${interaction.user.username}\n**📝 Name:** ${bewerberName}\n**🎂 Alter:** ${bewerberAge}\n**⏰ Erfahrung:** ${bewerberExperience} Jahre\n\n**🎯 Fähigkeiten:**\n${bewerberSkills}\n\n**💭 Motivation:**\n${bewerberMotivation}`)
            .addFields(
                { name: '🆔 User ID', value: `\`${interaction.user.id}\``, inline: true },
                { name: '📅 Bewerbungsdatum', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '🎯 Clan', value: 'SOG Shadow-of-Gods', inline: true }
            )
            .setFooter({ text: `${SOGConfig.BOT_NAME} • SOG Clan Bewerbung`, iconURL: SOGConfig.LOGO_URL })
            .setTimestamp();

        const acceptButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`accept_sog_bewerbung_${interaction.user.id}`)
                    .setLabel('✅ Annehmen')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId(`deny_sog_bewerbung_${interaction.user.id}`)
                    .setLabel('❌ Ablehnen')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        await ticketChannel.send({ embeds: [bewerbungEmbed], components: [acceptButton] });
        
        // Benachrichtige Support Rolle
        if (supportRole) {
            await ticketChannel.send(`@${supportRole.name} - Neue SOG Clan Bewerbung von ${interaction.user.username}!`);
        }
        
        const successEmbed = new EmbedBuilder()
            .setColor(SOGConfig.SUCCESS_COLOR)
            .setTitle('✅ SOG Bewerbung eingereicht!')
            .setDescription('Deine SOG Clan Bewerbung wurde erfolgreich eingereicht!\n\n**📋 Nächste Schritte:**\n• Support prüft deine Bewerbung\n• Du wirst per DM benachrichtigt\n• Support wird sich in diesem Ticket melden')
            .addFields(
                { name: '🎫 Ticket', value: `${ticketChannel}`, inline: true },
                { name: '👥 Support', value: supportRole ? supportRole.name : 'Admins', inline: true }
            )
            .setFooter({ text: `${SOGConfig.BOT_NAME} • SOG Clan Bewerbung`, iconURL: SOGConfig.LOGO_URL })
            .setTimestamp();
        await interaction.reply({ embeds: [successEmbed], flags: 64 });
    }

    // Bewerbung annehmen/ablehnen
    if (interaction.isButton() && (interaction.customId.startsWith('accept_application_') || interaction.customId.startsWith('deny_application_'))) {
        // Prüfe Admin-Berechtigung
        if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(SOGConfig.ERROR_COLOR)
                .setTitle('❌ Keine Berechtigung')
                .setDescription('Nur Administratoren können Bewerbungen annehmen/ablehnen!')
                .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                .setTimestamp();
            return interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
        
        const userId = interaction.customId.split('_')[2];
        const isAccepted = interaction.customId.startsWith('accept_application_');
        
        try {
            const user = await client.users.fetch(userId);
            const clanRole = interaction.guild.roles.cache.find(role => 
                role.name.toLowerCase().includes('clan') ||
                role.name.toLowerCase().includes('member') ||
                role.name.includes('✅ Verified')
            );

            if (isAccepted && clanRole) {
                const member = await interaction.guild.members.fetch(userId);
                await member.roles.add(clanRole);
                
                const acceptEmbed = new EmbedBuilder()
                    .setColor('#00ff88')
                    .setTitle('✅ Bewerbung angenommen!')
                    .setDescription(`Deine Clan Bewerbung wurde von **${interaction.user.username}** angenommen!\n\n**🎉 Herzlichen Glückwunsch!**\n• Du bist jetzt Clan-Mitglied\n• Du kannst am Server teilnehmen\n• Viel Spaß beim Spielen!`)
                    .addFields(
                        { name: '👮 Moderator', value: interaction.user.username, inline: true },
                        { name: '🎭 Neue Rolle', value: clanRole.name, inline: true },
                        { name: '📅 Datum', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setFooter({ text: 'SOG Admin Bot • Clan Bewerbung', iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                
                await user.send({ embeds: [acceptEmbed] });
                
                const adminEmbed = new EmbedBuilder()
                    .setColor('#00ff88')
                    .setTitle('✅ Bewerbung angenommen')
                    .setDescription(`**User:** ${user.username}\n**Moderator:** ${interaction.user.username}\n**Rolle:** ${clanRole.name}`)
                    .setFooter({ text: 'SOG Admin Bot • Clan Bewerbung', iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                await interaction.reply({ embeds: [adminEmbed], flags: 64 });
                
                console.log(`✅ Bewerbung angenommen für ${user.username} von ${interaction.user.username}`);
            } else if (!isAccepted) {
                const denyEmbed = new EmbedBuilder()
                    .setColor('#ff4444')
                    .setTitle('❌ Bewerbung abgelehnt')
                    .setDescription(`Deine Clan Bewerbung wurde von **${interaction.user.username}** abgelehnt.\n\n**💡 Tipps für die Zukunft:**\n• Verbessere deine Bewerbung\n• Warte einige Wochen\n• Erstelle ein Ticket bei Fragen`)
                    .addFields(
                        { name: '👮 Moderator', value: interaction.user.username, inline: true },
                        { name: '📅 Datum', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setFooter({ text: 'SOG Admin Bot • Clan Bewerbung', iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                
                await user.send({ embeds: [denyEmbed] });
                
                const adminEmbed = new EmbedBuilder()
                    .setColor('#ff4444')
                    .setTitle('❌ Bewerbung abgelehnt')
                    .setDescription(`**User:** ${user.username}\n**Moderator:** ${interaction.user.username}`)
                    .setFooter({ text: 'SOG Admin Bot • Clan Bewerbung', iconURL: interaction.guild.iconURL() })
                    .setTimestamp();
                await interaction.reply({ embeds: [adminEmbed], flags: 64 });
                
                console.log(`❌ Bewerbung abgelehnt für ${user.username} von ${interaction.user.username}`);
            }
        } catch (error) {
            console.error('❌ Fehler beim Annehmen/Ablehnen der Bewerbung:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(SOGConfig.ERROR_COLOR)
                .setTitle('❌ Fehler')
                .setDescription('Fehler beim Verarbeiten der Bewerbung.')
                .addFields(
                    { name: '🔧 Fehler', value: error.message, inline: false }
                )
                .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                .setTimestamp();
            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    }

    // SOG Bewerbung annehmen/ablehnen
    if (interaction.isButton() && (interaction.customId.startsWith('accept_sog_bewerbung_') || interaction.customId.startsWith('deny_sog_bewerbung_'))) {
        // Prüfe Admin-Berechtigung
        if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(SOGConfig.ERROR_COLOR)
                .setTitle('❌ Keine Berechtigung')
                .setDescription('Nur Administratoren können SOG Bewerbungen annehmen/ablehnen!')
                .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                .setTimestamp();
            return interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
        
        const userId = interaction.customId.split('_')[3];
        const isAccepted = interaction.customId.startsWith('accept_sog_bewerbung_');
        
        try {
            const user = await client.users.fetch(userId);
            const sogRole = interaction.guild.roles.cache.find(role => 
                role.name.toLowerCase().includes('sog') ||
                role.name.toLowerCase().includes('shadow') ||
                role.name.toLowerCase().includes('clan') ||
                role.name.includes('✅ Verified')
            );

            if (isAccepted && sogRole) {
                const member = await interaction.guild.members.fetch(userId);
                await member.roles.add(sogRole);
                
                const acceptEmbed = new EmbedBuilder()
                    .setColor(SOGConfig.SUCCESS_COLOR)
                    .setTitle('✅ SOG Clan Bewerbung angenommen!')
                    .setDescription(`Deine SOG Clan Bewerbung wurde von **${interaction.user.username}** angenommen!\n\n**🎉 Herzlichen Glückwunsch!**\n• Du bist jetzt SOG Clan-Mitglied\n• Du kannst am Server teilnehmen\n• Viel Spaß beim Spielen!`)
                    .addFields(
                        { name: '👮 Moderator', value: interaction.user.username, inline: true },
                        { name: '🎭 Neue Rolle', value: sogRole.name, inline: true },
                        { name: '📅 Datum', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setFooter({ text: `${SOGConfig.BOT_NAME} • SOG Clan Bewerbung`, iconURL: SOGConfig.LOGO_URL })
                    .setTimestamp();
                
                await user.send({ embeds: [acceptEmbed] });
                
                const adminEmbed = new EmbedBuilder()
                    .setColor(SOGConfig.SUCCESS_COLOR)
                    .setTitle('✅ SOG Bewerbung angenommen')
                    .setDescription(`**User:** ${user.username}\n**Moderator:** ${interaction.user.username}\n**Rolle:** ${sogRole.name}`)
                    .setFooter({ text: `${SOGConfig.BOT_NAME} • SOG Clan Bewerbung`, iconURL: SOGConfig.LOGO_URL })
                    .setTimestamp();
                await interaction.reply({ embeds: [adminEmbed], flags: 64 });
                
                console.log(`✅ SOG Bewerbung angenommen für ${user.username} von ${interaction.user.username}`);
            } else if (!isAccepted) {
                const denyEmbed = new EmbedBuilder()
                    .setColor(SOGConfig.ERROR_COLOR)
                    .setTitle('❌ SOG Bewerbung abgelehnt')
                    .setDescription(`Deine SOG Clan Bewerbung wurde von **${interaction.user.username}** abgelehnt.\n\n**💡 Tipps für die Zukunft:**\n• Verbessere deine Bewerbung\n• Warte einige Wochen\n• Erstelle ein Ticket bei Fragen`)
                    .addFields(
                        { name: '👮 Moderator', value: interaction.user.username, inline: true },
                        { name: '📅 Datum', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                    )
                    .setFooter({ text: `${SOGConfig.BOT_NAME} • SOG Clan Bewerbung`, iconURL: SOGConfig.LOGO_URL })
                    .setTimestamp();
                
                await user.send({ embeds: [denyEmbed] });
                
                const adminEmbed = new EmbedBuilder()
                    .setColor(SOGConfig.ERROR_COLOR)
                    .setTitle('❌ SOG Bewerbung abgelehnt')
                    .setDescription(`**User:** ${user.username}\n**Moderator:** ${interaction.user.username}`)
                    .setFooter({ text: `${SOGConfig.BOT_NAME} • SOG Clan Bewerbung`, iconURL: SOGConfig.LOGO_URL })
                    .setTimestamp();
                await interaction.reply({ embeds: [adminEmbed], flags: 64 });
                
                console.log(`❌ SOG Bewerbung abgelehnt für ${user.username} von ${interaction.user.username}`);
            }
        } catch (error) {
            console.error('❌ Fehler beim Annehmen/Ablehnen der SOG Bewerbung:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(SOGConfig.ERROR_COLOR)
                .setTitle('❌ Fehler')
                .setDescription('Fehler beim Verarbeiten der SOG Bewerbung.')
                .addFields(
                    { name: '🔧 Fehler', value: error.message, inline: false }
                )
                .setFooter({ text: SOGConfig.BOT_NAME, iconURL: SOGConfig.LOGO_URL })
                .setTimestamp();
            await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    }

    // Ticket System
    if (interaction.isButton() && interaction.customId === 'create_ticket') {
        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                },
            ],
        });

        const ticketEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎫 Ticket erstellt')
            .setDescription(`**Ticket von:** ${interaction.user.username}\n\n**📋 Support wird sich bald bei dir melden.**\n\n**🎯 Bitte beschreibe dein Problem:**\n• Was ist passiert?\n• Wann ist es passiert?\n• Welche Schritte hast du bereits versucht?`)
            .addFields(
                { name: '👤 User', value: interaction.user.username, inline: true },
                { name: '🆔 User ID', value: `\`${interaction.user.id}\``, inline: true },
                { name: '📅 Erstellt', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter({ text: 'SOG Admin Bot • Ticket System', iconURL: interaction.guild.iconURL() })
            .setTimestamp();

        const closeButton = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Ticket schließen')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

        await ticketChannel.send({ embeds: [ticketEmbed], components: [closeButton] });
        
        const successEmbed = new EmbedBuilder()
            .setColor('#00ff88')
            .setTitle('✅ Ticket erstellt!')
            .setDescription(`Dein Ticket wurde erfolgreich erstellt: ${ticketChannel}`)
            .setFooter({ text: 'SOG Admin Bot • Ticket System', iconURL: interaction.guild.iconURL() })
            .setTimestamp();
        await interaction.reply({ embeds: [successEmbed], flags: 64 });

        // Log
        const logChannel = interaction.guild.channels.cache.find(channel => 
            channel.name.toLowerCase().includes('ticket-logs')
        );
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor('#00ff88')
                .setTitle('🎫 Ticket erstellt')
                .setDescription(`**User:** ${interaction.user.username}\n**Channel:** ${ticketChannel}`)
                .setFooter({ text: 'SOG Admin Bot • Ticket Logs', iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        const logChannel = interaction.guild.channels.cache.find(channel => 
            channel.name.toLowerCase().includes('ticket-logs')
        );
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor('#ff4444')
                .setTitle('🔒 Ticket geschlossen')
                .setDescription(`**User:** ${interaction.user.username}\n**Channel:** ${interaction.channel.name}`)
                .setFooter({ text: 'SOG Admin Bot • Ticket Logs', iconURL: interaction.guild.iconURL() })
                .setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
        
        await interaction.channel.delete();
    }
});

// Message Logs
client.on('messageDelete', async (message) => {
    if (message.author?.bot) return;
    
    const logChannel = message.guild.channels.cache.find(channel => 
        channel.name.toLowerCase().includes('message-logs')
    );
    
    if (logChannel) {
        let content = 'Keine Nachricht';
        
        // Prüfe ob es eine Textnachricht ist und Content hat
        if (message.content && message.content.trim() !== '') {
            content = message.content;
        } else if (message.attachments.size > 0) {
            content = `📎 Anhang: ${message.attachments.map(a => a.name).join(', ')}`;
        } else if (message.embeds.length > 0) {
            content = '📋 Embed-Nachricht';
        } else if (message.stickers.size > 0) {
            content = '😀 Sticker-Nachricht';
        }
        
        const logEmbed = new EmbedBuilder()
            .setColor('#ff4444')
            .setTitle('🗑️ Nachricht gelöscht')
            .setDescription(`**Author:** ${message.author.username}\n**Channel:** ${message.channel.name}\n**Content:** ${content}`)
            .addFields(
                { name: '👤 Author', value: message.author.username, inline: true },
                { name: '📺 Channel', value: message.channel.name, inline: true },
                { name: '🆔 Message ID', value: `\`${message.id}\``, inline: true }
            )
            .setFooter({ text: 'SOG Admin Bot • Message Logs', iconURL: message.guild.iconURL() })
            .setTimestamp();
        await logChannel.send({ embeds: [logEmbed] });
    }
});



client.login(process.env.DISCORD_TOKEN); 
