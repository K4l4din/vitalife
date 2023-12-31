﻿const Discord = require ("discord.js");
const logsData = require('../../models/logs.js');
const users = require('../../models/users.js');

const ms = require("ms")

module.exports = {
	name: 'interactionCreate',
	once: false,
execute: async (interaction, client) => {
    await slashCommands();

    async function slashCommands() {
        if(interaction.isChatInputCommand()) {

            const cmd = client.slashCommands.get(interaction.commandName);
            if(!cmd) {
                //return interaction.channel.send({ content: `${interaction.member}, **une erreur s'est produite.**` })
            }
            const args = [];
            for (let option of interaction.options.data) {
                if (option.type === "SUB_COMMAND") {
                    if (option.name) args.push(option.name);
                    option.options?.forEach((x) => {
                        if (x.value) args.push(x.value);
                    });
                } else if (option.value) args.push(option.value);
            }
            interaction.member = interaction.guild.members.cache.get(interaction.user.id);
    
            //console.log(db.get(`guild_${interaction.guild.id}_settings`))
            const cooldownData = `${interaction.user.id}/${interaction.commandName}`;
            if (client.cooldown.has(cooldownData)) {
              const time = ms(client.cooldown.get(cooldownData) - Date.now());
              
              return interaction.reply({ 
                embeds: [new Discord.EmbedBuilder().setDescription(`Veuillez patienter ${time.replace('m', ' minutes')} avant de pouvoir réutiliser cette commande.`)],
                
              });
            }        
        interaction.setCooldown = (time) => {
          client.cooldown.set(cooldownData, Date.now() + time);
          setTimeout(() => client.cooldown.delete(cooldownData), time);
        };

            console.log(`[SLASH COMMANDS] `.bold.red + `/${cmd.name}`.bold.blue + ` has been executed`.bold.white)
            cmd.execute(client, interaction, args);
        } else if(interaction.isButton()) {

          if (interaction.customId === 'pds'){
            let  cl = await logsData.findOne({ guildID: interaction.guild.id })
            if(!cl) return interaction.reply({ content: `Channel des services non défini`, ephemeral: true});

            const userData = await users.findOne({ userID: interaction.user.id });

            if(userData) {
              if(userData.isInService) {
                interaction.reply({ content: `Vous avez déjà pris votre prise de service.`, ephemeral: true})
              } else {
                let canal = client.channels.resolve(cl.channelID);

                if(canal){
                  userData.isInService = true;
                  userData.serviceStartTime = new Date();
                  await userData.save();

                  const now = new Date();
                  const hours = now.getHours();
                  const minutes = now.getMinutes();
      
                  const formattedTime = `${hours.toString().padStart(2, '0')}h${minutes.toString().padStart(2, '0')}`; 
                  const embed = new Discord.EmbedBuilder()
                  .setAuthor({ name: `Prise de service - ${interaction.user.globalName}`, iconURL: 'https://cdn.discordapp.com/icons/1068556793896247356/c258200f480d432709f8fc68ad1e1ce6.webp?size=128',})
                  .setThumbnail('https://cdn.discordapp.com/icons/1068556793896247356/c258200f480d432709f8fc68ad1e1ce6.webp?size=128')
                  .setColor('Green')
                  .addFields(
                    { name: `Agent`, value: `${interaction.user}`},
                    { name: `Heure`, value: `${formattedTime}`}
                  ) 
                  .setFooter({ text: `Prise de service - EMS`})

                  canal.send({embeds: [embed]})
  
                  interaction.reply({content: `Vous avez pris votre service.`, ephemeral: true})
                } else {
                  return interaction.reply({ content: `Channel des services non trouvé`, ephemeral: true});
                }
              }
            } else {
              const newUser = new users({
                userID: interaction.user.id,
                serviceStartTime: new Date(),
                totalServiceTime: 0,
                isInService: true
              })

              await newUser.save();
            }
            
          }
          
          if (interaction.customId === 'fds'){

            let  cl = await logsData.findOne({ guildID: interaction.guild.id })
            if(!cl) return interaction.reply({ content: `Channel des services non défini`, ephemeral: true});

            const userData = await users.findOne({ userID: interaction.user.id });

            if(userData) {
              if(userData.isInService) {
                let canal = client.channels.resolve(cl.channelID);

                if(canal) {
                  const currentTime = new Date();
                  const serviceTime = currentTime - userData.serviceStartTime;
                  userData.totalServiceTime += serviceTime;
                  userData.isInService = false;
  
                  await userData.save();
  
                  const serviceHours = Math.floor(serviceTime / 3600000);
                  const serviceMinutes = Math.floor((serviceTime % 3600000) / 60000);
                  const serviceSeconds = Math.floor((serviceTime % 60000) / 1000);
                  const now = new Date();
                  const hours = now.getHours();
                  const minutes = now.getMinutes();

                  const totalServiceHours = Math.floor(userData.totalServiceTime / 3600000);
                  const totalServiceMinutes = Math.floor((userData.totalServiceTime % 3600000) / 60000);
                  const totalServiceSeconds = Math.floor((userData.totalServiceTime % 60000) / 1000);

                  const totalFormat = `${totalServiceHours}h${totalServiceMinutes}m${totalServiceSeconds}s`

                  const formattedTime1 = `${hours.toString().padStart(2, '0')}h${minutes.toString().padStart(2, '0')}`; 

                  const formattedTime2 = `${serviceHours}h ${serviceMinutes}m ${serviceSeconds}s`

                  const embed = new Discord.EmbedBuilder()
                  .setAuthor({ name: `Fin de service - ${interaction.user.globalName}`, iconURL: 'https://cdn.discordapp.com/icons/1068556793896247356/c258200f480d432709f8fc68ad1e1ce6.webp?size=128',})
                  .setThumbnail('https://cdn.discordapp.com/icons/1068556793896247356/c258200f480d432709f8fc68ad1e1ce6.webp?size=128')
                  .setColor('Red')
                  .addFields(
                    { name: `Agent`, value: `${interaction.user}`},
                    { name: `Heure`, value: `${formattedTime1}`},
                    { name: `Temps de service:`, value: `${formattedTime2}`},
                    { name: `Temps total en service:`, value: `${totalFormat}`},
                  ) 
                  .setFooter({ text: `Fin de service - EMS`})
    
                    canal.send({embeds: [embed]})
                    interaction.reply({content: `Vous avez pris votre fin de service.`, ephemeral: true})

                } else {
                  return interaction.reply({ content: `Channel des services non trouvé`, ephemeral: true});
                }
              } else {
                interaction.reply({ content: `Vous n'avez pas pris votre prise de service.`, ephemeral: true})
              }
            } else {
              interaction.reply({ content: 'Vous n\'avez pas enregistré de prise de service.', ephemeral: true });
            }
            
          }
        } 

    }
}
}