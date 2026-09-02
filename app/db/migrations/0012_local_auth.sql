ALTER TABLE `users`
  ADD COLUMN `passwordHash` varchar(255),
  ADD COLUMN `sessionVersion` int NOT NULL DEFAULT 1;
