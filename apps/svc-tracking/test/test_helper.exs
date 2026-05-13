# Test helper for Lastmile Gig Tracking Service
# Starts ExUnit and configures test environment

ExUnit.start()

# Define Mox mocks for external dependencies
Mox.defmock(LmgTracking.Mock.RedisPool, for: LmgTracking.Redis.PoolBehaviour)
Mox.defmock(LmgTracking.Mock.KafkaProducer, for: LmgTracking.Kafka.ProducerBehaviour)
Mox.defmock(LmgTracking.Mock.TokenVerifier, for: LmgTracking.Auth.TokenVerifierBehaviour)
