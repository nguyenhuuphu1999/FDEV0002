const { v4 } = require('uuid');
const { validationResult } = require('express-validator');

const Log = require('../models/log');
const Game = require('../models/game');
const User = require('../models/user');
const Cash = require('../models/cash');
const Order = require('../models/order');
const Keygame = require('../models/keygame');
const SockerIO = require('../../io');

exports.getGamesHomepage = async (req, res, next) => {
	// TODO: find trong db theo query
	const { developer, sortBy, price, page = 1 } = req.query;
	const ITEM_PER_PAGE = 12;

	try {
		const queryObj = {};
		if (developer) {
			queryObj.developer = developer;
		}

		let sortByObj = '-createdAt';
		if (sortBy) {
			const [method, category] = sortBy.split('-');
			sortByObj = { [category]: method === 'dec' ? -1 : 1 };
		}

		if (price) {
			const [min, max] = price.split(',');
			queryObj.price = { $gte: min };
			if (max) queryObj.price.$lte = max;
		}

		const total = await Game.find(queryObj).countDocuments();

		const games = await Game.find(queryObj, {
			name: 1,
			price: 1,
			images: { $slice: 1 },
		})
			.skip((page - 1) * ITEM_PER_PAGE)
			.limit(ITEM_PER_PAGE)
			.sort(sortByObj);

		res.status(200).json({ games, total });
	} catch (err) {
		console.log(err);
		next(err);
	}
};

exports.findGameByName = async (req, res, next) => {
	const name = req.query.name || '';
	const page = req.query.page || 0;
	const ITEM_PER_PAGE = 12;

	const queryString = name
		.split('')
		.map((c) => `${c}[\\w\\W ]*`)
		.join('');

	const nameReg = new RegExp(queryString);
	try {
		games = await Game.find(
			{ name: { $regex: nameReg, $options: 'gi' } },
			{ name: 1, price: 1, images: { $slice: 1 } },
		)
			.sort('-createdAt')
			.skip(page * ITEM_PER_PAGE)
			.limit(12);

		res.json({ games });
	} catch (err) {
		next(err);
	}
};

exports.getDetailGameById = async (req, res, next) => {
	const { gameId } = req.params;
	const { userId } = req;
	try {
		let owned = false;
		const game = await Game.findById(gameId)
			.populate('developer tags.tagId')
			.populate('comments.userId', 'name avatar')
			.populate('comments.replies.userId', 'name avatar');

		if (!game) {
			throw new Error();
		}

		if (userId) {
			const user = await User.findById(userId, 'activatedGames');
			owned = !!user.activatedGames.find((gId) => gId.toString() === gameId);
		}

		const sendBackGame = { ...game._doc };
		if (!owned) {
			delete sendBackGame.linkSteam;
		}

		res.status(200).json({ game: sendBackGame });
	} catch (err) {
		console.log(err);
		const error = new Error('Kh??ng t??m th???y game');
		error.statusCode = 404;
		next(error);
	}
};

exports.getCart = async (req, res, next) => {
	const { userId } = req;

	try {
		const user = await User.findById(userId).populate('cart', {
			images: { $slice: 1 },
			name: 1,
			price: 1,
		});

		const cart = user.cart.map((item) => {
			return { ...item._doc, owned: user.activatedGames.includes(item._id) };
		});

		res.json({ cart });
	} catch (err) {
		console.log(err);
		next(err);
	}
};

exports.addToCart = async (req, res, next) => {
	const { gameId } = req.body;

	try {
		const user = await User.findById(req.userId);

		// *Check xem trong gi??? h??ng ???? c?? game ???? ch??a
		if (user.cart.includes(gameId)) {
			const error = new Error('Game ???? c?? trong gi??? h??ng');
			error.statusCode = 422;
			return next(error);
		}

		// *l???y th??ng tin game, add v??o gi??? h??ng c???a user, tr??? res
		const resGame = await Game.findById(gameId, {
			name: 1,
			price: 1,
			images: { $slice: 1 },
		});

		await user.addItemToCart(gameId);

		res
			.status(201)
			.json({ message: 'Th??m s???n ph???m th??nh c??ng', game: resGame });
	} catch (err) {
		console.log(err);
		const error = new Error('Y??u c???u kh??ng h???p l???!');
		error.statusCode = 422;
		next(error);
	}
};

exports.removeItemCart = async (req, res, next) => {
	const { gameId } = req.params;
	const userId = req.userId;

	try {
		const user = await User.findById(userId);
		const result = await user.removeItemFromCart(gameId);

		res.json(result);
	} catch (err) {
		console.log(err);
		next(err);
	}
};

exports.createCash = async (req, res, next) => {
	try {
		const cashData = {
			serial: Math.random().toString().replace('0.', ''),
			code: v4(),
			denominate: 1000000, //Math.round(Math.random() * 10),
		};
		const cash = await new Cash(cashData);
		const result = await cash.save();

		res.status(201).json(result);
	} catch (err) {
		console.log(err);
		next(err);
	}
};

exports.postCash = async (req, res, next) => {
	const { serial, code } = req.body;
	const userId = req.userId;

	try {
		const cash = await Cash.findOne({ serial, code });

		// *M?? kh??ng t???n t???i
		if (!cash) {
			const error = new Error('Kh??ng t??m th???y m??');
			error.statusCode = 404;
			return next(error);
		}

		// *???? c?? ng?????i n???p
		if (cash.activatedBy) {
			const error = new Error('M?? ???? c?? ng?????i n???p');
			error.statusCode = 422;
			return next(error);
		}

		// *Th???c hi???n n???p cash
		const user = await User.findById(userId);
		user.balance += cash.denominate;
		const result = await user.save();

		cash.activatedBy = userId;
		await cash.save();

		res.status(201).json({
			message: `N???p th??nh c??ng ${cash.denominate} VN?? v??o t??i kho???n ${user.username}.`,
			balance: result.balance,
		});
	} catch (err) {
		console.log(err);
		next(err);
	}
};

exports.postPurchaseGames = async (req, res, next) => {
	const { games } = req.body;
	const userId = req.userId;

	try {
		const gamesList = await Game.find({ _id: { $in: games } }, 'price');
		const TOTAL_PRICE = gamesList.reduce(
			(total, game) => total + game.price,
			0,
		);

		const user = await User.findById(userId, 'balance');

		if (user.balance < TOTAL_PRICE) {
			const error = new Error(
				'T??i kho???n c???a b???n kh??ng ????? ????? th???c hi???n thanh to??n',
			);
			error.statusCode = 422;
			throw error;
		}

		const order = new Order({ userId });

		// *t???o key cho t???ng game trong order g???i l??n
		// *push v??o order
		for (const gameId of games) {
			const keygame = new Keygame({ gameId, key: v4() });
			await keygame.save();
			const game = gamesList.find((game) => game._id.toString() === gameId);
			order.games.push({
				game,
				price: game.price,
				keygame,
			});
		}
		user.balance -= TOTAL_PRICE;
		user.cart = [];

		await user.save();
		await order.save();

		res.json({ message: 'Mua game th??nh c??ng', newBalance: user.balance });
	} catch (err) {
		console.log(err);
		next(err);
	}
};

exports.getOrdersByUserId = async (req, res, next) => {
	const { userId } = req;

	try {
		const orders = await Order.find({ userId }, '-userId -games.key')
			.populate('games.game', {
				name: 1,
				images: { $slice: 1 },
			})
			.populate('games.key', 'key')
			.sort({ createdAt: -1 });

		res.status(200).json({
			orders: orders.map((order) => {
				return { ...order._doc, key: order._id };
			}),
		});
	} catch (err) {
		console.log(err);
		next(err);
	}
};

exports.getDetailOrderById = async (req, res, next) => {
	const { userId } = req;
	const { orderId } = req.params;

	try {
		const order = await Order.findById(orderId)
			.populate('games.game', {
				name: 1,
				description: 1,
				images: { $slice: 1 },
			})
			.populate('games.keygame', 'key activatedBy');

		if (order.userId.toString() !== userId) {
			const error = new Error('B???n kh??ng c?? quy???n xem order n??y!');
			error.statusCode = 402;
			return next(error);
		}

		const user = await User.findById(userId, 'activatedGames');

		const activatedList = order.games.reduce((total, gameItem) => {
			total[gameItem.game._id.toString()] = !!user.activatedGames.find(
				(gameId) => {
					return gameId.toString() === gameItem.game._id.toString();
				},
			);
			return total;
		}, {});

		res.status(200).json({ order, activatedList });
	} catch (err) {
		console.log(err);
		next(err);
	}
};

exports.checkKeygame = async (req, res, next) => {
	const { key } = req.body;

	try {
		const keygame = await Keygame.findOne({ key }).populate('gameId', {
			name: 1,
			images: { $slice: 1 },
		});

		if (!keygame) {
			throw new Error();
		}

		res.json({ keygame });
	} catch (err) {
		const error = new Error('Keygame kh??ng h???p l???, xin h??y ki???m tra l???i!');
		error.statusCode = 404;
		next(error);
	}
};

exports.activatedGameByKeygame = async (req, res, next) => {
	const { userId } = req;
	const key = req.body.keygame;

	try {
		const keygame = await Keygame.findOne({ key }).populate('gameId', 'name');
		if (keygame.activatedBy) {
			const error = new Error('Keygame n??y ???? c?? ng?????i s??? d???ng!');
			error.statusCode = 422;
			return next(error);
		}

		const user = await User.findById(userId);
		const isHaveThisGame = user.activatedGames.find(
			(gameId) => gameId.toString() === keygame.gameId._id.toString(),
		);
		if (isHaveThisGame) {
			const error = new Error(
				`T??i kho???n ???? s??? h???u game ${keygame.gameId.name} n??y r???i!`,
			);
			error.statusCode = 422;
			return next(error);
		}

		keygame.activatedBy = user;
		await keygame.save();

		user.activatedGames.push(keygame.gameId);
		await user.save();

		res.json({
			keygame: {
				_id: keygame._id,
				key: keygame.key,
				activatedBy: user._id,
			},
			gameId: keygame.gameId._id,
		});
	} catch (err) {
		console.log(err);
		next(err);
	}
};

exports.postCommentInGame = async (req, res, next) => {
	const result = validationResult(req);

	if (!result.isEmpty()) {
		const error = new Error(result.array()[0].msg);
		error.statusCode = 422;
		return next(error);
	}

	try {
		const { userId } = req;
		const { comment } = req.body;
		const { gameId } = req.params;
		const game = await Game.findById(gameId, 'comments');

		game.comments.unshift({ userId, comment: comment.trim() });

		await game.save();

		res.json({ comment: game.comments[0] });
	} catch (err) {
		console.log(err);
		next(err);
	}
};

exports.deleteCommentInGame = async (req, res, next) => {
	try {
		const { userId } = req;
		const { gameId, commentId } = req.params;
		const game = await Game.findById(gameId, 'comments');

		const commentIndex = game.comments.findIndex(
			(comment) => comment._id.toString() === commentId.toString(),
		);

		if (commentIndex < 0) {
			const error = new Error('Kh??ng t??m th???y b??nh lu???n!');
			error.statusCode = 404;
			return next(error);
		}

		if (game.comments[commentIndex].userId.toString() !== userId) {
			const error = new Error('Kh??ng th??? x??a b??nh lu???n c???a ng?????i kh??c!');
			error.statusCode = 422;
			return next(error);
		}

		game.comments.splice(commentIndex, 1);
		await game.save();

		res.json({ message: '???? x??a b??nh lu???n!' });
	} catch (err) {
		console.log(err);
		next(err);
	}
};

exports.postReplyInCommentGame = async (req, res, next) => {
	// TODO: post reply -> ghi log -> push notification + realtime
	const result = validationResult(req);

	if (!result.isEmpty()) {
		const error = new Error(result.array()[0].msg);
		error.statusCode = 422;
		return next(error);
	}

	try {
		const { userId } = req;
		const { gameId, commentId } = req.params;
		const { comment } = req.body;

		const game = await Game.findById(gameId, 'name comments');

		const commentIndex = game.comments.findIndex(
			(comment) => comment._id.toString() === commentId,
		);

		if (commentIndex < 0) {
			const error = new Error('Kh??ng t??m th???y b??nh lu???n!');
			error.statusCode = 404;
			return next(error);
		}

		game.comments[commentIndex].replies.push({ userId, comment });

		await game.save();

		// TODO: ghi log
		const log = new Log({ userId, rootId: gameId, type: 'reply game' });
		await log.save();

		res.json({ reply: game.comments[commentIndex].replies.slice(-1)[0] });

		//TODO: push notification + realtime
		const ownerComment = game.comments[commentIndex].userId.toString();

		if (userId === ownerComment) return;

		const user = await User.findById(ownerComment, 'name avatar notifications');
		user.notifications.newNotifications++;
		user.notifications.list.push({ logId: log });
		await user.save();

		const io = SockerIO.getIO();
		io.to(ownerComment).emit('reply game', {
			user: { name: user.name, avatar: user.avatar },
			game: { gameId, name: game.name },
		});
	} catch (err) {
		console.log(err);
		next(err);
	}
};

exports.deleteReplyInGame = async (req, res, next) => {
	const { userId } = req;
	const { gameId, commentId, replyId } = req.params;

	try {
		const game = await Game.findById(gameId, 'comments');
		const commentIndex = game.comments.findIndex(
			(comment) => comment._id.toString() === commentId.toString(),
		);
		if (commentIndex < 0) {
			const error = new Error('Kh??ng t??m th???y b??nh lu???n!');
			error.statusCode = 404;
			return next(error);
		}

		const replyIndex = game.comments[commentIndex].replies.findIndex(
			(reply) => reply._id.toString() === replyId.toString(),
		);

		if (replyIndex < 0) {
			const error = new Error('Kh??ng t??m th???y tr??? l???i b??nh lu???n!');
			error.statusCode = 404;
			return next(error);
		}

		if (
			game.comments[commentIndex].replies[replyIndex].userId.toString() !==
			userId.toString()
		) {
			const error = new Error('B???n kh??ng th??? x??a b??nh lu???n c???a ng?????i kh??c!');
			error.statusCode = 402;
			return next(error);
		}

		game.comments[commentIndex].replies.splice(replyIndex, 1);

		await game.save();

		res.json({ message: '???? x??a b??nh lu???n' });
	} catch (err) {
		console.log(err);
		next(err);
	}
};
