import { isValidRequest, PlatformAlgorithm } from "discord-verify"

export default {
	async scheduled(controller, env, ctx) {
		const guilds = JSON.parse(await env.db.get('guilds'))
		for (const guildId of guilds.splice(0, 100)) {
			const guildDataReq = await fetch(
				`https://discord.com/api/v9/guilds/${guildId}`,
				{
					headers: {
						'content-type': 'application/json',
						authorization: `Bot ${env.botToken}`
					}
				}
			)
			if (!guildDataReq.ok) {
				console.warn(`Guild: ${guildId} DATA FETCH FAILED: \n\n${await guildDataReq.text()}`)
				continue
			}
			const guildData = await guildDataReq.json()
			const disableUntil = new Date()
			disableUntil.setHours(disableUntil.getHours() + 23)
			const guildDataPut = await fetch(
				`https://discord.com/api/v9/guilds/${guildId}/incident-actions`,
				{
					method: 'PUT',
					headers: {
						'content-type': 'application/json',
						authorization: `Bot ${env.botToken}`
					},
					body: JSON.stringify({
						invites_disabled_until: ((guildData.incidents_data) ? guildData.incidents_data.invites_disabled_until : undefined),
						dms_disabled_until: disableUntil.toISOString()
					})
				}
			)
			if (!guildDataPut.ok) {
				console.warn(`Guild: ${guildId} DATA FETCH FAILED: \n\n${await guildDataPut.text()}`)
				continue
			}
			guilds.push(guildId)
		}
		await env.db.put('guilds', JSON.stringify(guilds))
	},
	async fetch(request, env, ctx) {
		const isValid = await isValidRequest(
			request,
			env.botPublicKey,
			PlatformAlgorithm.Cloudflare
		)
			
		if (!isValid) {
			return new Response('', { status: 401 });
		}
	
		const message = await request.json()
	
		let command = undefined
		if (message.type === 1) {
			return new Response(JSON.stringify({
				type: 1
			}, null, 2), { headers: {'Content-Type': 'application/json;charset=UTF-8'}, status: 200 })
		} else if (message.type === 2 || message.type === 5 || message.type === 4) {
			command = message.data.name
		} else if (message.type === 3) {
			command = message.data.custom_id
		}
		console.info(`[COMMAND USED] ${command}`)

		if (command == 'enable') {
			const guilds = JSON.parse(await env.db.get('guilds'))
			const guildId = message.guild_id
			if (guilds.includes(guildId)) {

				return new Response(JSON.stringify({
				  type: 4,
				  data: {
					flags: 64,
					content: 'Service already enabled.'
				  }
				}, null, 2), { headers: {'Content-Type': 'application/json;charset=UTF-8'}, status: 200 })
				
			}
			const guildDataReq = await fetch(
				`https://discord.com/api/v9/guilds/${guildId}`,
				{
					headers: {
						'content-type': 'application/json',
						authorization: `Bot ${env.botToken}`
					}
				}
			)
			if (!guildDataReq.ok) {

				return new Response(JSON.stringify({
				  type: 4,
				  data: {
					flags: 64,
					content: 'Error fetching guild data. No changes made.'
				  }
				}, null, 2), { headers: {'Content-Type': 'application/json;charset=UTF-8'}, status: 200 })

			}
			const guildData = await guildDataReq.json()
			const disableUntil = new Date()
			disableUntil.setHours(disableUntil.getHours() + 23)
			const guildDataPut = await fetch(
				`https://discord.com/api/v9/guilds/${guildId}/incident-actions`,
				{
					method: 'PUT',
					headers: {
						'content-type': 'application/json',
						authorization: `Bot ${env.botToken}`
					},
					body: JSON.stringify({
						invites_disabled_until: ((guildData.incidents_data) ? guildData.incidents_data.invites_disabled_until : undefined),
						dms_disabled_until: disableUntil.toISOString()
					})
				}
			)
			if (!guildDataPut.ok) {

				return new Response(JSON.stringify({
				  type: 4,
				  data: {
					flags: 64,
					content: `Error setting guild data. No changes made.\n\n${await guildDataPut.text()}\n\nInvites: ${((guildData.incidents_data) ? guildData.incidents_data.invites_disabled_until : undefined)}\nDMS: ${disableUntil.toISOString()}`
				  }
				}, null, 2), { headers: {'Content-Type': 'application/json;charset=UTF-8'}, status: 200 })

			}
			guilds.push(guildId)
			await env.db.put('guilds', JSON.stringify(guilds))

			return new Response(JSON.stringify({
			  type: 4,
			  data: {
				flags: 64,
				content: 'Service enabled.'
			  }
			}, null, 2), { headers: {'Content-Type': 'application/json;charset=UTF-8'}, status: 200 })
		} else if (command == 'disable') {
			const guilds = JSON.parse(await env.db.get('guilds'))
			const guildId = message.guild_id
			if (!guilds.includes(guildId)) {

				return new Response(JSON.stringify({
				  type: 4,
				  data: {
					flags: 64,
					content: 'Service already disabled.'
				  }
				}, null, 2), { headers: {'Content-Type': 'application/json;charset=UTF-8'}, status: 200 })
				
			}
			guilds.splice(guilds.indexOf(guildId), 1)
			await env.db.put('guilds', JSON.stringify(guilds))

			return new Response(JSON.stringify({
			  type: 4,
			  data: {
				flags: 64,
				content: 'Service disabled.'
			  }
			}, null, 2), { headers: {'Content-Type': 'application/json;charset=UTF-8'}, status: 200 })
		}
	}
}
