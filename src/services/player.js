import Player from '../models/player'
import { findLevelWithTotal, getTotalScore, findLevelByValue, getLastLevel } from  '../services/level'

export function getPlayers(page = 1, pageSize = 50, sort) {
    var query = Player.find({}).limit(pageSize).skip((page - 1) * pageSize)
    if(!_.isEmpty(sort)) {
        query.sort(sort)
    }

    return Promise.props({
        totalCount: Player.count({}),
        items: query
    }).then(function ({ totalCount, items }) {
        return {
            items,
            page,
            pageSize,
            totalCount,
            pageCount: getTotalPages(totalCount, pageSize)
        }
    });
}

function getTotalPages(totalRecordsCount, pageSize) {
    if(pageSize == 0 || totalRecordsCount == 0) {
        return 0;
    }

    return Math.ceil(totalRecordsCount / pageSize)
}

export function getPlayer(identifier) {
    return Player.findOne({ identifier });
}

export function* increasePoints(id, points) {
    let player = yield getPlayer(id);
    if(player == null) {
        throw new Error("Player does not exist!");
    }

    player.levelScore += points;
    player.totalScore += points;

    if(player.levelScore > player.level.maximumPoints) {
        let newLevel = yield findLevelWithTotal(player.totalScore);
        if(newLevel == null) {
            // Reached the last level
            newLevel = yield getLastLevel();
            player.level = newLevel;
            player.levelScore = newLevel.maximumPoints;
        } else {
            // Increased level
            const difference = player.totalScore - newLevel.fromTotal;
            player.level = newLevel;
            player.levelScore = difference;
        }
    }

    yield recalculateProgress(player)

    return yield player.save();
}

function* recalculateProgress(player) {
    let levelProgress = (player.levelScore / player.level.maximumPoints) * 100;
    player.levelProgress = Math.round(levelProgress * 100) / 100;

    let totalScore = yield getTotalScoreForLevels();
    if (player.totalScore > totalScore) {
        player.totalScore = totalScore;
    }
    
    player.totalProgress = Math.round((player.totalScore / totalScore) * 10000) / 100;
}

function* getTotalScoreForLevels() {
    let totalScore = undefined;
    if (process.env.env == "production") {
        totalScore = cache.get("totalScore");
    }

    if(totalScore == undefined) {
        totalScore = (yield getTotalScore())[0].totalScore;
        cache.set("totalScore", totalScore);
        const HALF_DAY = 1000 * 60 * 60 * 12;
        cache.ttl("totalScore", HALF_DAY);
    }

    return totalScore;
}

export function* decreasePoints(id, points) {
    let player = yield getPlayer(id);
    if(player == null) {
        throw new Error("Player does not exist!");
    }

    player.levelScore -= points;
    player.totalScore -= points;

    if(player.levelScore < player.level.maximumPoints) {
        const difference = player.levelScore - player.level.maximumPoints;
        const newLevel = yield findLevelWithTotal(player.totalScore);
        if(newLevel == null) {
            // Reached the first level
            player.levelScore = player.level.fromTotal;
        } else {
            // Increased level
            player.level = newLevel;
            player.levelScore = difference;
        }
    }

    yield recalculateProgress(player)

    return yield player.save();
}

export function* createPlayer(identifier, levelValue, levelScore, levelProgress, totalScore, totalProgress) {
    //TODO: Validate level points and player score are correct
    const level = yield findLevelByValue(levelValue);
    if(level == null) {
        throw new ValidationError("Level is missing");
    }

    return yield Player.create({
        identifier,
        level,
        levelScore,
        levelProgress,
        totalScore,
        totalProgress
    })
}