package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type Expense struct {
	ID          bson.ObjectID `json:"_id,omitempty" bson:"_id,omitempty"`
	Description *string       `json:"description" bson:"description"`
	Cost        *float32      `json:"cost" bson:"cost"`
	CreatedDate time.Time     `json:"createdDate" bson:"createdDate"`
}

var coll *mongo.Collection

func main() {
	if os.Getenv("MODE") != "prod" {
		if err := godotenv.Load(); err != nil {
			log.Fatal("Error loading .env file", err)
		}
	}

	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		log.Fatal("Set `MONGODB_URI` variable")
	}
	client, err := mongo.Connect(options.Client().ApplyURI(uri))
	if err != nil {
		panic(err)
	}
	defer func() {
		if err := client.Disconnect(context.Background()); err != nil {
			panic(err)
		}
	}()

	coll = client.Database("golang_db").Collection("expenses")

	setupListener()
}

func setupListener() {
	app := fiber.New()

	if os.Getenv("MODE") != "prod" {
		app.Use(cors.New())
	}

	app.Get("/api/expenses", getExpenses)
	app.Post("/api/expenses", createExpense)
	app.Patch("/api/expenses/:id", updateExpense)
	app.Delete("/api/expenses/:id", removeExpense)

	if os.Getenv("MODE") == "prod" {
		app.Static("/", "./client/dist")
	}

	port := os.Getenv("PORT")
	log.Fatal(app.Listen(":" + port))
}

var costNotPositiveNumErr = fiber.Map{
	"success": false,
	"message": "`cost` must be a positive number",
}
var descriptionEmptyErr = fiber.Map{
	"success": false,
	"message": "`description` must not be empty",
}

func getErrorResp(err error) fiber.Map {
	return fiber.Map{
		"success": false,
		"message": fmt.Sprint(err),
	}
}

func getExpenses(c *fiber.Ctx) error {
	cursor, err := coll.Find(context.Background(), bson.M{})
	if err != nil {
		return c.Status(400).JSON(getErrorResp(err))
	}
	defer cursor.Close(context.Background())

	var expenses []Expense
	if err = cursor.All(context.Background(), &expenses); err != nil {
		return c.Status(400).JSON(getErrorResp(err))
	}

	return c.JSON(expenses)
}

func createExpense(c *fiber.Ctx) error {
	expense := &Expense{}
	if err := c.BodyParser(expense); err != nil {
		return c.Status(400).JSON(getErrorResp(err))
	}

	if expense.Cost == nil || *expense.Cost <= 0 {
		return c.Status(400).JSON(costNotPositiveNumErr)
	}

	if expense.Description == nil || *expense.Description == "" {
		return c.Status(400).JSON(descriptionEmptyErr)
	}

	expense.CreatedDate = time.Now()

	result, err := coll.InsertOne(context.TODO(), expense)
	if err != nil {
		return c.Status(400).JSON(getErrorResp(err))
	}

	expense.ID = result.InsertedID.(bson.ObjectID)

	return c.Status(201).JSON(expense)
}

func updateExpense(c *fiber.Ctx) error {
	id := c.Params("id")
	obejectID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return c.Status(400).JSON(getErrorResp(err))
	}

	newExpense := &Expense{}
	if err := c.BodyParser(newExpense); err != nil {
		return c.Status(400).JSON(getErrorResp(err))
	}
	newExpenseBson := bson.M{}

	if newExpense.Cost != nil {
		if *newExpense.Cost <= 0 {
			return c.Status(400).JSON(costNotPositiveNumErr)
		}
		newExpenseBson["cost"] = newExpense.Cost
	}

	if newExpense.Description != nil {
		if *newExpense.Description == "" {
			return c.Status(400).JSON(descriptionEmptyErr)
		}
		newExpenseBson["description"] = newExpense.Description
	}

	_, err = coll.UpdateOne(
		context.Background(),
		bson.M{"_id": obejectID},
		bson.M{"$set": newExpenseBson},
	)
	if err != nil {
		return c.Status(400).JSON(getErrorResp(err))
	}

	return c.Status(200).JSON(fiber.Map{"success": true})
}

func removeExpense(c *fiber.Ctx) error {
	id := c.Params("id")
	obejectID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return c.Status(400).JSON(getErrorResp(err))
	}

	result, err := coll.DeleteOne(
		context.Background(),
		bson.M{"_id": obejectID},
	)
	if err != nil {
		return c.Status(400).JSON(getErrorResp(err))
	}
	if result.DeletedCount == 0 {
		return c.Status(404).JSON(fiber.Map{
			"success": false,
			"message": "no entity with such `id`",
		})
	}

	return c.Status(200).JSON(fiber.Map{"success": true})
}
