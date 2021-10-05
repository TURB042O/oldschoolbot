import { User } from 'discord.js';
import { notEmpty } from 'e';
import { KlasaUser } from 'klasa';

import { BitField, PerkTier, Roles } from '../constants';
import { UserSettings } from '../settings/types/UserSettings';
import { getSupportGuild } from '../util';

const tier3ElligibleBits = [BitField.IsPatronTier3, BitField.isContributor, BitField.isModerator];

export default function getUsersPerkTier(
	userOrBitfield: KlasaUser | readonly BitField[],
	noCheckOtherAccounts?: boolean
): PerkTier | 0 {
	if (noCheckOtherAccounts !== true && userOrBitfield instanceof KlasaUser) {
		let main = userOrBitfield.settings.get(UserSettings.MainAccount);
		const allAccounts: string[] = [...userOrBitfield.settings.get(UserSettings.IronmanAlts), userOrBitfield.id];
		if (main) {
			allAccounts.push(main);
		}

		const allAccountTiers = allAccounts
			.map(id => userOrBitfield.client.users.cache.get(id))
			.filter(notEmpty)
			.map(t => getUsersPerkTier(t, true));

		const highestAccountTier = Math.max(0, ...allAccountTiers);
		return highestAccountTier;
	}

	if (userOrBitfield instanceof User && userOrBitfield.client.owners.has(userOrBitfield)) {
		return 10;
	}

	const bitfield =
		userOrBitfield instanceof User ? userOrBitfield.settings.get(UserSettings.BitField) : userOrBitfield;

	if (bitfield.includes(BitField.IsPatronTier5)) {
		return PerkTier.Six;
	}

	if (bitfield.includes(BitField.IsPatronTier4)) {
		return PerkTier.Five;
	}

	if (tier3ElligibleBits.some(bit => bitfield.includes(bit))) {
		return PerkTier.Four;
	}

	if (bitfield.includes(BitField.IsPatronTier2) || bitfield.includes(BitField.HasPermanentTierOne)) {
		return PerkTier.Three;
	}

	if (bitfield.includes(BitField.IsPatronTier1)) {
		return PerkTier.Two;
	}

	if (bitfield.includes(BitField.HasPermanentTierOne)) {
		return PerkTier.Two;
	}

	if (userOrBitfield instanceof User) {
		const supportGuild = getSupportGuild(userOrBitfield.client);
		const member = supportGuild.members.cache.get(userOrBitfield.id);
		if (member && [Roles.Booster].some(roleID => member.roles.cache.has(roleID))) {
			return PerkTier.One;
		}
	}

	return 0;
}

/**
 * Determines if the user is only a patron because they have shared perks from another account.
 */
export function isPrimaryPatron(user: KlasaUser) {
	const perkTier = getUsersPerkTier(user, true);
	return perkTier > 0;
}
