import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccountAssetsSocial {
  @ApiPropertyOptional() website?: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() blog?: string;
  @ApiPropertyOptional() twitter?: string;
  @ApiPropertyOptional() discord?: string;
  @ApiPropertyOptional() telegram?: string;
  @ApiPropertyOptional() facebook?: string;
  @ApiPropertyOptional() instagram?: string;
  @ApiPropertyOptional() youtube?: string;
  @ApiPropertyOptional() whitepaper?: string;
  @ApiPropertyOptional() coinmarketcap?: string;
  @ApiPropertyOptional() coingecko?: string;
  @ApiPropertyOptional() linkedin?: string;
}

export class AccountAssets {
  @ApiProperty() address!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiPropertyOptional({ type: AccountAssetsSocial }) social?: AccountAssetsSocial;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiPropertyOptional() proof?: string;
  @ApiPropertyOptional() iconPng?: string;
  @ApiPropertyOptional() iconSvg?: string;
}

export class IdentityAssets {
  @ApiProperty() identity!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: [String] }) owners!: string[];
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() avatar?: string;
  @ApiPropertyOptional() twitter?: string;
  @ApiPropertyOptional() website?: string;
  @ApiPropertyOptional() location?: string;
}

export class NftRank {
  @ApiProperty() identifier!: string;
  @ApiProperty() rank!: number;
}

export class TokenAssets {
  @ApiProperty() identifier!: string;
  @ApiProperty() website!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ enum: ['active', 'inactive'], default: 'inactive' }) status!: string;
  @ApiProperty() name!: string;
  @ApiProperty() pngUrl!: string;
  @ApiProperty() svgUrl!: string;
  @ApiPropertyOptional() ledgerSignature?: string;
  @ApiPropertyOptional() lockedAccounts?: string;
  @ApiPropertyOptional({ type: [String] }) extraTokens?: string[];
  @ApiPropertyOptional({ enum: ['trait', 'statistical', 'openRarity', 'jaccardDistances', 'custom'] }) preferredRankAlgorithm?: string;
  @ApiPropertyOptional({ type: Number }) priceSource?: number;
  @ApiPropertyOptional({ type: [NftRank] }) ranks?: NftRank[];
  @ApiPropertyOptional({ type: Object }) social?: Record<string, unknown>;
}

